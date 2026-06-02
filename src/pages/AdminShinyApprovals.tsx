import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

type Submission = {
  id: string;
  pokemon_name: string;
  nickname?: string;
  region?: string;
  method?: string;
  catch_date?: string;
  notes?: string;
  screenshot_url?: string;
  iv_screenshot_url?: string;
  status: string;
  user_id: string;
};

export default function AdminShinyApprovals() {
  const [submissions, setSubmissions] =
    useState<Submission[]>([]);

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    const { data } = await supabase
      .from("shiny_submissions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      });

    setSubmissions(data || []);
  }

  async function approve(
    submission: Submission
  ) {
    const { error } =
      await supabase
        .from("shinies")
        .insert({
          pokemon_name:
            submission.pokemon_name,

          nickname:
            submission.nickname,

          region:
            submission.region,

          method:
            submission.method,

          catch_date:
            submission.catch_date,

          notes:
            submission.notes,

          screenshot_url:
            submission.screenshot_url,

          user_id:
            submission.user_id,
        });

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from("shiny_submissions")
      .update({
        status: "approved",
      })
      .eq("id", submission.id);

    loadSubmissions();
  }

  async function reject(
    submissionId: string
  ) {
    await supabase
      .from("shiny_submissions")
      .update({
        status: "rejected",
      })
      .eq("id", submissionId);

    loadSubmissions();
  }

  return (
    <div className="page">
      <h1>✨ Shiny Approvals</h1>

      <div className="event-grid">
        {submissions.map(
          (submission) => (
            <div
              key={submission.id}
              className="event-card"
            >
              {submission.screenshot_url && (
                <img
                  src={
                    submission.screenshot_url
                  }
                  className="event-card-image"
                  alt=""
                />
              )}

              <div className="event-card-content">
                <h3>
                  {
                    submission.pokemon_name
                  }
                </h3>

                <p>
                  Region:{" "}
                  {submission.region}
                </p>

                <p>
                  Method:{" "}
                  {submission.method}
                </p>

                <p>
                  Date:{" "}
                  {
                    submission.catch_date
                  }
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "10px",
                  }}
                >
                  <button
                    className="save-winners-btn"
                    onClick={() =>
                      approve(
                        submission
                      )
                    }
                  >
                    Approve
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() =>
                      reject(
                        submission.id
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {submissions.length ===
          0 && (
          <div className="card">
            No pending shiny
            submissions.
          </div>
        )}
      </div>
    </div>
  );
}