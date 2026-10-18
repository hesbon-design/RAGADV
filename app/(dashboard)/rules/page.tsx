import * as React from "react";
import { sql, initDatabase } from "@/lib/db";
import { RuleStudio } from "@/components/rules/rule-studio";

export const instant = false;

export default async function RulesPage() {
  await initDatabase();

  const defaultDepts = await sql<Array<{ id: string; name: string }>>`
    SELECT id, name FROM departments ORDER BY created_at ASC LIMIT 1
  `;
  const defaultDept = defaultDepts[0];

  const departmentId = defaultDept?.id || "dept-engineering";
  const departmentName = defaultDept?.name || "Engineering Operations";

  const profiles = await sql<Array<{ id: string; title: string; category: string }>>`
    SELECT p.id, p.title, p.category
    FROM rule_profiles p
    JOIN departments d ON p.id = d.default_rule_profile_id
    WHERE d.id = ${departmentId}
  `;
  const profile = profiles[0];

  let latestVersion = null;

  if (profile) {
    const versionRows = await sql<
      Array<{
        id: string;
        version_number: number;
        mandatory_sections: unknown;
        threshold_rules: unknown;
        red_flag_keywords: unknown;
        custom_rule_cards: unknown;
      }>
    >`
      SELECT 
        id, version_number, mandatory_sections, threshold_rules,
        red_flag_keywords, custom_rule_cards
      FROM rule_profile_versions
      WHERE rule_profile_id = ${profile.id}
      ORDER BY version_number DESC
      LIMIT 1
    `;

    const versionRow = versionRows[0];

    if (versionRow) {
      latestVersion = {
        id: versionRow.id,
        version_number: versionRow.version_number,
        mandatory_sections: Array.isArray(versionRow.mandatory_sections)
          ? versionRow.mandatory_sections
          : typeof versionRow.mandatory_sections === "string"
          ? JSON.parse(versionRow.mandatory_sections)
          : [],
        threshold_rules: Array.isArray(versionRow.threshold_rules)
          ? versionRow.threshold_rules
          : typeof versionRow.threshold_rules === "string"
          ? JSON.parse(versionRow.threshold_rules)
          : [],
        red_flag_keywords: Array.isArray(versionRow.red_flag_keywords)
          ? versionRow.red_flag_keywords
          : typeof versionRow.red_flag_keywords === "string"
          ? JSON.parse(versionRow.red_flag_keywords)
          : [],
        custom_rule_cards: Array.isArray(versionRow.custom_rule_cards)
          ? versionRow.custom_rule_cards
          : typeof versionRow.custom_rule_cards === "string"
          ? JSON.parse(versionRow.custom_rule_cards)
          : [],
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
