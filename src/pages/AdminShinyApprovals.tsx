import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

export default function AdminShinyApprovals() {
  const [
    submissions,
    setSubmissions,
  ] = useState<any[]>([]);

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    const result =
      await supabase
        .from(
          "shiny_submissions"
        )
        .select(`
          *,
          pokemon:pokemon_id(*),
          profile:profile_id(*)
        `)
        .eq(
          "status",
          "pending"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

    setSubmissions(
      result.data || []
    );
  }

  async function approve(
    submission: any
  ) {
    const insert =
      await supabase
        .from(
          "shiny_catches"
        )
.insert({
  pokemon_id: submission.pokemon_id,

  profile_id: submission.profile_id,

  member_name:
    submission.profile?.nickname,

  date_found: submission.date_found,

  method: submission.method,

  notes: submission.notes,

  screenshot_url:
    submission.screenshot_url,
});

    if (insert.error) {
      alert(
        insert.error
          .message
      );
      return;
    }

    await supabase
      .from(
        "shiny_submissions"
      )
      .update({
        status:
          "approved",
      })
      .eq(
        "id",
        submission.id
      );

    loadSubmissions();
  }

  async function reject(
    id: string
  ) {
    await supabase
      .from(
        "shiny_submissions"
      )
      .update({
        status:
          "rejected",
      })
      .eq("id", id);

    loadSubmissions();
  }

  return (
    <div className="page">
      <h1 className="page-title">
        Shiny Approvals
      </h1>

      <div className="event-grid">

        {submissions.map(
          (
            submission
          ) => (
            <div
              key={
                submission.id
              }
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
                    submission
                      .pokemon
                      ?.name
                  }
                </h3>

                <p>
                  Trainer:
                  {" "}
                  {
                    submission
                      .profile
                      ?.nickname
                  }
                </p>

                <p>
                  Method:
                  {" "}
                  {
                    submission.method
                  }
                </p>

                <p>
                  Date:
                  {" "}
                  {
                    submission.date_found
                  }
                </p>

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
          )
        )}

      </div>
    </div>
  );
}