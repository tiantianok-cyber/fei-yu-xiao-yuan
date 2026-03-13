import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Grade upgrade mapping
const GRADE_ORDER = [
  '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
  '初一', '初二', '初三', '高一', '高二', '高三',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Determine current period: March = 下学期, September = 上学期 (of next grade)
  const now = new Date();
  const month = now.getMonth() + 1; // 1-based

  // This function runs on Mar 1 and Sep 1
  // Mar 1: 上学期 -> 下学期 (same grade)
  // Sep 1: 下学期 -> 上学期 (next grade)
  const isMarch = month <= 8; // If triggered Mar 1
  const isSeptember = month >= 9; // If triggered Sep 1

  // Fetch all non-幼儿园 profiles with grade/semester set
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, child_grade, child_semester')
    .not('child_grade', 'is', null)
    .not('child_grade', 'eq', '')
    .not('child_grade', 'eq', '幼儿园');

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let updatedCount = 0;

  for (const profile of profiles || []) {
    const grade = profile.child_grade;
    const semester = profile.child_semester;
    let newGrade = grade;
    let newSemester = semester;

    if (isMarch && semester === '上学期') {
      // Mar: upgrade 上学期 -> 下学期, same grade
      newSemester = '下学期';
    } else if (isSeptember && semester === '下学期') {
      // Sep: upgrade to next grade 上学期
      const idx = GRADE_ORDER.indexOf(grade);
      if (idx >= 0 && idx < GRADE_ORDER.length - 1) {
        newGrade = GRADE_ORDER[idx + 1];
        newSemester = '上学期';
      } else {
        // Already at 高三 or not in list, skip
        continue;
      }
    } else {
      continue;
    }

    if (newGrade !== grade || newSemester !== semester) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ child_grade: newGrade, child_semester: newSemester })
        .eq('id', profile.id);

      if (!updateError) updatedCount++;
    }
  }

  return new Response(JSON.stringify({ success: true, updatedCount }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
