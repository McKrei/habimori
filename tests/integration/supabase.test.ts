import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testEmail = process.env.SUPABASE_TEST_EMAIL;
const testPassword = process.env.SUPABASE_TEST_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey || !testEmail || !testPassword) {
  throw new Error(
    "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_TEST_EMAIL, or SUPABASE_TEST_PASSWORD.",
  );
}

const adminClient = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const testRunId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

let userId = "";
let contextId = "";
let goalId = "";
let counterEventId = "";

beforeAll(async () => {
  if (adminClient) {
    const { error } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    if (error && !/already\s+registered/i.test(error.message)) {
      throw new Error(`Failed to ensure test user: ${error.message}`);
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Failed to sign in test user.");
  }

  userId = data.user.id;
});

describe("supabase integration", () => {
  it("creates and reads goal data", async () => {
    const { data: context, error: contextError } = await supabase
      .from("contexts")
      .insert({ user_id: userId, name: `test-context-${testRunId}` })
      .select("id")
      .single();

    expect(contextError).toBeNull();
    expect(context?.id).toBeTruthy();
    contextId = context?.id ?? "";

    const startDate = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title: `Test goal ${testRunId}`,
        goal_type: "counter",
        period: "week",
        target_value: 3,
        target_op: "gte",
        start_date: startDate,
        end_date: endDate,
        context_id: contextId,
      })
      .select("id")
      .single();

    expect(goalError).toBeNull();
    expect(goal?.id).toBeTruthy();
    goalId = goal?.id ?? "";

    const { data: counterEvent, error: counterError } = await supabase
      .from("counter_events")
      .insert({
        user_id: userId,
        goal_id: goalId,
        context_id: contextId,
        occurred_at: new Date().toISOString(),
        value_delta: 1,
      })
      .select("id")
      .single();

    expect(counterError).toBeNull();
    expect(counterEvent?.id).toBeTruthy();
    counterEventId = counterEvent?.id ?? "";

    const { data: fetchedGoal, error: fetchError } = await supabase
      .from("goals")
      .select("id, title")
      .eq("id", goalId)
      .single();

    expect(fetchError).toBeNull();
    expect(fetchedGoal?.id).toBe(goalId);
  });
});

async function cleanup() {
  if (counterEventId) {
    await supabase.from("counter_events").delete().eq("id", counterEventId);
  }
  if (goalId) {
    await supabase.from("goals").delete().eq("id", goalId);
  }
  if (contextId) {
    await supabase.from("contexts").delete().eq("id", contextId);
  }
  await supabase.auth.signOut();
}

afterAll(async () => {
  await cleanup();
});
