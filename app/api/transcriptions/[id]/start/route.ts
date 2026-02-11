import { NextResponse } from "next/server";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const workerUrl = process.env.WORKER_URL;
  if (!workerUrl) {
    return NextResponse.json({ error: "WORKER_URL is not configured" }, { status: 500 });
  }

  const queueUrl = process.env.CLOUD_TASKS_CREATE_URL;
  const serviceAccountEmail = process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL;

  if (queueUrl && serviceAccountEmail) {
    const token = process.env.GCP_BEARER_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "GCP_BEARER_TOKEN is missing for task creation" }, { status: 500 });
    }

    const taskBody = {
      task: {
        httpRequest: {
          httpMethod: "POST",
          url: `${workerUrl}/tasks/transcribe`,
          headers: { "Content-Type": "application/json" },
          body: Buffer.from(JSON.stringify({ transcriptionId: params.id })).toString("base64"),
          oidcToken: {
            serviceAccountEmail,
            audience: workerUrl
          }
        }
      }
    };

    const taskResponse = await fetch(queueUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(taskBody)
    });

    if (!taskResponse.ok) {
      const text = await taskResponse.text();
      return NextResponse.json({ error: `task enqueue failed: ${text}` }, { status: 500 });
    }

    return NextResponse.json({ accepted: true, mode: "cloud-tasks" });
  }

  const fallback = await fetch(`${workerUrl}/tasks/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcriptionId: params.id })
  });

  if (!fallback.ok) {
    const text = await fallback.text();
    return NextResponse.json({ error: text }, { status: 500 });
  }

  return NextResponse.json({ accepted: true, mode: "direct" });
}
