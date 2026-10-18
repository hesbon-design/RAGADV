import * as React from "react";
import { db } from "@/lib/db";
import { RuleStudio } from "@/components/rules/rule-studio";

export default async function RulesPage() {
  const defaultDept = db
    .prepare("SELECT id, name FROM departments ORDER BY created_at ASC LIMIT 1")
    .get() as { id: string; name: string } | undefined;

  const departmentId = defaultDept?.id || "dept-engineering";
  const departmentName = defaultDept?.name || "Engineering Operations";

  const profile = db
    .prepare(`
      SELECT p.id, p.title, p.category
      FROM rule_profiles p
      JOIN departments d ON p.id = d.default_rule_profile_id
      WHERE d.id = ?
    `)
    .get(departmentId) as { id: string; title: string; category: string } | undefined;

  let latestVersion = null;

  if (profile) {
    const versionRow = db
      .prepare(`
        SELECT 
          id, version_number, mandatory_sections, threshold_rules,
          red_flag_keywords, custom_rule_cards
        FROM rule_profile_versions
        WHERE rule_profile_id = ?
        ORDER BY version_number DESC
        LIMIT 1
      `)
      .get(profile.id) as {
        id: string;
        version_number: number;
        mandatory_sections: string;
        threshold_rules: string;
        red_flag_keywords: string;
        custom_rule_cards: string;
      } | undefined;

    if (versionRow) {
      latestVersion = {
        id: versionRow.id,
        version_number: versionRow.version_number,
        mandatory_sections: JSON.parse(versionRow.mandatory_sections || "[]"),
        threshold_rules: JSON.parse(versionRow.threshold_rules || "[]"),
        red_flag_keywords: JSON.parse(versionRow.red_flag_keywords || "[]"),
        custom_rule_cards: JSON.parse(versionRow.custom_rule_cards || "[]"),
      };
    }
  }

  return (
    <RuleStudio
      initialDepartment={{
        id: departmentId,
        name: departmentName,
      }}
      initialProfile={
        profile
          ? {
              ...profile,
              latestVersion,
            }
          : null
      }
    />
  );
}
