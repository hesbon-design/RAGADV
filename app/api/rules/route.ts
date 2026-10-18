import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let departmentId = searchParams.get("departmentId");

    if (!departmentId) {
      const defaultDept = db
        .prepare("SELECT id FROM departments ORDER BY created_at ASC LIMIT 1")
        .get() as { id: string } | undefined;
      departmentId = defaultDept?.id || "dept-engineering";
    }

    // Get profiles for this department
    const profiles = db
      .prepare(`
        SELECT p.id, p.title, p.category, p.is_active, p.created_at,
               (p.id = d.default_rule_profile_id) as is_default
        FROM rule_profiles p
        JOIN departments d ON p.department_id = d.id
        WHERE p.department_id = ?
        ORDER BY p.created_at DESC
      `)
      .all(departmentId) as Array<{
        id: string;
        title: string;
        category: string;
        is_active: number;
        is_default: number;
      }>;

    // Get latest version for each profile
    const profilesWithVersions = profiles.map((prof) => {
      const version = db
        .prepare(`
          SELECT 
            id, version_number, mandatory_sections, threshold_rules,
            red_flag_keywords, custom_rule_cards, created_at
          FROM rule_profile_versions
          WHERE rule_profile_id = ?
          ORDER BY version_number DESC
          LIMIT 1
        `)
        .get(prof.id) as {
          id: string;
          version_number: number;
          mandatory_sections: string;
          threshold_rules: string;
          red_flag_keywords: string;
          custom_rule_cards: string;
          created_at: string;
        } | undefined;

      return {
        ...prof,
        latestVersion: version
          ? {
              ...version,
              mandatory_sections: JSON.parse(version.mandatory_sections || "[]"),
              threshold_rules: JSON.parse(version.threshold_rules || "[]"),
              red_flag_keywords: JSON.parse(version.red_flag_keywords || "[]"),
              custom_rule_cards: JSON.parse(version.custom_rule_cards || "[]"),
            }
          : null,
      };
    });

    return NextResponse.json({ profiles: profilesWithVersions });
  } catch (error) {
    console.error("Failed to fetch rule profiles:", error);
    return NextResponse.json(
      { error: "Internal server error fetching rule profiles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      profileId,
      departmentId,
      title,
      category,
      mandatorySections,
      thresholdRules,
      redFlagKeywords,
      customRuleCards,
    } = body;

    let targetProfileId = profileId;

    const saveTransaction = db.transaction(() => {
      // If no profileId provided, create new profile
      if (!targetProfileId) {
        targetProfileId = `prof_${crypto.randomUUID().replace(/-/g, "")}`;
        db.prepare(`
          INSERT INTO rule_profiles (id, department_id, title, category, is_active)
          VALUES (?, ?, ?, ?, 1)
        `).run(
          targetProfileId,
          departmentId || "dept-engineering",
          title || "Custom Compliance Profile",
          category || "General"
        );
      }

      // Find current latest version number
      const latestVer = db
        .prepare(`
          SELECT MAX(version_number) as max_v
          FROM rule_profile_versions
          WHERE rule_profile_id = ?
        `)
        .get(targetProfileId) as { max_v: number | null };

      const nextVersionNumber = (latestVer?.max_v || 0) + 1;
      const versionId = `ver_${crypto.randomUUID().replace(/-/g, "")}`;

      db.prepare(`
        INSERT INTO rule_profile_versions (
          id, rule_profile_id, version_number,
          mandatory_sections, threshold_rules, red_flag_keywords, custom_rule_cards
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        versionId,
        targetProfileId,
        nextVersionNumber,
        JSON.stringify(mandatorySections || []),
        JSON.stringify(thresholdRules || []),
        JSON.stringify(redFlagKeywords || []),
        JSON.stringify(customRuleCards || [])
      );

      // Log audit
      db.prepare(`
        INSERT INTO audit_logs (id, department_id, action, metadata)
        VALUES (?, ?, ?, ?)
      `).run(
        `log_rule_${Date.now()}`,
        departmentId || null,
        "RULE_PROFILE_VERSION_SAVED",
        JSON.stringify({
          profileId: targetProfileId,
          versionNumber: nextVersionNumber,
        })
      );

      return { targetProfileId, versionId, nextVersionNumber };
    });

    const result = saveTransaction();

    return NextResponse.json({
      success: true,
      profileId: result.targetProfileId,
      versionId: result.versionId,
      versionNumber: result.nextVersionNumber,
    });
  } catch (error) {
    console.error("Failed to save rule profile version:", error);
    return NextResponse.json(
      { error: "Internal server error saving rule profile version" },
      { status: 500 }
    );
  }
}
