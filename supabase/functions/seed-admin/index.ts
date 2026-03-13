import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const admins = [
    { phone: "15810505520", password: "tiangang123", nickname: "管理员", role: "admin" as const },
    { phone: "18080860823", password: "tiangang123", nickname: "审核员", role: "moderator" as const },
  ];

  const results: string[] = [];

  for (const admin of admins) {
    const email = `${admin.phone}@flyfly.local`;

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(
      (u) => u.email === email
    );

    let userId: string;

    if (existing) {
      userId = existing.id;
      results.push(`User ${admin.phone} already exists (${userId})`);
    } else {
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email,
        password: admin.password,
        email_confirm: true,
        user_metadata: {
          phone: admin.phone,
          nickname: admin.nickname,
          province: "北京市",
          city: "北京市",
          district: "朝阳区",
          community: "",
          school: "",
          child_grade: "",
          child_semester: "",
        },
      });

      if (error) {
        results.push(`Error creating ${admin.phone}: ${error.message}`);
        continue;
      }
      userId = newUser.user.id;
      results.push(`Created user ${admin.phone} (${userId})`);
    }

    // Ensure role exists
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", admin.role)
      .maybeSingle();

    if (!existingRole) {
      await supabase.from("user_roles").insert({ user_id: userId, role: admin.role });
      results.push(`Assigned role ${admin.role} to ${admin.phone}`);
    }
  }

  // Create test product for admin 15810505520
  const { data: adminUser } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("phone", "15810505520")
    .maybeSingle();

  if (adminUser) {
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id")
      .eq("seller_id", adminUser.user_id)
      .maybeSingle();

    if (!existingProduct) {
      const { error: productError } = await supabase.from("products").insert({
        seller_id: adminUser.user_id,
        type: "book",
        name: "小学数学 三年级上册",
        author: "人民教育出版社",
        publisher: "人民教育出版社",
        publish_date: "2023-06",
        grade: ["三年级"],
        semester: "上学期",
        book_tag: "教材",
        condition: "almost_new",
        condition_note: "仅翻阅过几次，无笔记无折痕",
        description: "人教版小学三年级上册数学课本，品相很好，适合下学期升三年级的同学使用。",
        price: 8.5,
        school: "北京市朝阳区实验小学",
        status: "on_sale",
      });
      if (productError) {
        results.push(`Error creating product: ${productError.message}`);
      } else {
        results.push("Created test book product");
      }
    } else {
      results.push("Test product already exists");
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { "Content-Type": "application/json" },
  });
});
