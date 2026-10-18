import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql, initDatabase } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initDatabase();

    const { searchParams } = new URL(request.url);
    let departmentId = searchParams.get("departmentId");

    if (!departmentId) {
      const defaultDepts = await sql`SELECT id FROM departments ORDER BY created_at ASC LIMIT 1`;
      departmentId = defaultDepts[0]?.id || "dept-engineering";
    }

    // Get profiles for this department
    const profiles = await sql`
      SELECT p.id, p.title, p.category, p.is_active, p.created_at,
             (p.id = d.default_rule_profile_id) as is_default
      FROM rule_profiles p
      JOIN departments d ON p.department_id = d.id
      WHERE p.department_id = ${departmentId}
      ORDER BY p.created_at DESC
    `;

    // Get latest version for each profile
    const profilesWithVersions = await Promise.all(
      profiles.map(async (prof) => {
        const versions = await sql`
          SELECT 
            id, version_number, mandatory_sections, threshold_rules,
            red_flag_keywords, custom_rule_cards, created_at
          FROM rule_profile_versions
          WHERE rule_profile_id = ${prof.id}
          ORDER BY version_number DESC
          LIMIT 1
        `;

        const version = versions[0];
        return {
          ...prof,
          latestVersion: version
            ? {
                ...version,
                mandatory_sections: Array.isArray(version.mandatory_sections)
                  ? version.mandatory_sections
                  : typeof version.mandatory_sections === "string"
                  ? JSON.parse(version.mandatory_sections)
                  : [],
                threshold_rules: Array.isArray(version.threshold_rules)
                  ? version.threshold_rules
                  : typeof version.threshold_rules === "string"
                  ? JSON.parse(version.threshold_rules)
                  : [],
                red_flag_keywords: Array.isArray(version.red_flag_keywords)
                  ? version.red_flag_keywords
                  : typeof version.red_flag_keywords === "string"
                  ? JSON.parse(version.red_flag_keywords)
                  : [],
                custom_rule_cards: Array.isArray(version.custom_rule_cards)
                  ? version.custom_rule_cards
                  : typeof version.custom_rule_cards === "string"
                  ? JSON.parse(version.custom_rule_cards)
                  : [],
              }
            : null,
        };
      })
    );

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

    await initDatabase();

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
    let nextVersionNumber = 1;
    let versionId = "";

    await sql.begin(async (trx) => {
      // If no profileId provided, create new profile
      if (!targetProfileId) {
        targetProfileId = `prof_${crypto.randomUUID().replace(/-/g, "")}`;
        await trx`
          INSERT INTO rule_profiles (id, department_id, title, category, is_active)
          VALUES (${targetProfileId}, ${departmentId || "dept-engineering"}, ${title || "Custom Compliance Profile"}, ${category || "General"}, 1)
        `;
      }

      // Find current latest version number
      const latestVers = await trx`
        SELECT MAX(version_number) as max_v
        FROM rule_profile_versions
        WHERE rule_profile_id = ${targetProfileId}
      `;

      nextVersionNumber = (latestVers[0]?.max_v || 0) + 1;
      versionId = `ver_${crypto.randomUUID().replace(/-/g, "")}`;

      await trx`
        INSERT INTO rule_profile_versions (
          id, rule_profile_id, version_number,
          mandatory_sections, threshold_rules, red_flag_keywords, custom_rule_cards
        )
        VALUES (
          ${versionId},
          ${targetProfileId},
          ${nextVersionNumber},
          ${sql.json(mandatorySections || [])},
          ${sql.json(thresholdRules || [])},
          ${sql.json(redFlagKeywords || [])},
          ${sql.json(customRuleCards || [])}
        )
      `;

      // Log audit
      await trx`
        INSERT INTO audit_logs (id, department_id, action, metadata)
        VALUES (
          ${`log_rule_${Date.now()}`},
          ${departmentId || null},
          'RULE_PROFILE_VERSION_SAVED',
          ${sql.json({
            profileId: targetProfileId,
            versionNumber: nextVersionNumber,
          })}
        )
      `;
    });

    return NextResponse.json({
      success: true,
      profileId: targetProfileId,
      versionId,
      versionNumber: nextVersionNumber,
    });
  } catch (error) {
    console.error("Failed to save rule profile version:", error);
    return NextResponse.json(
      { error: "Internal server error saving rule profile version" },
      { status: 500 }
    );
  }
}
