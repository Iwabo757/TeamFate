import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import { supabase } from "../lib/supabase";

interface War {
  id: string;
  team_one_name: string;
  team_two_name: string;
}

interface Member {
  id: string;
  username: string;
  nickname: string;
}

interface TeamMember {
  id: string;
  member_id: string | null;
  member_name: string;
  team: string;
}

export default function ManageShinyWarTeams() {

  const { id } = useParams();

  const [war, setWar] =
    useState<War | null>(
      null
    );

  const [members, setMembers] =
    useState<Member[]>([]);

  const [teamMembers,
    setTeamMembers] =
    useState<TeamMember[]>(
      []
    );

  const [selectedMember,
    setSelectedMember] =
    useState("");

  const [manualName,
    setManualName] =
    useState("");

  const [team,
    setTeam] =
    useState("");

  useEffect(() => {
    if (!id) return;

    loadWar();
    loadMembers();
    loadTeamMembers();
  }, [id]);

  async function loadWar() {

    const { data } =
      await supabase
        .from("shiny_wars")
        .select("*")
        .eq("id", id)
        .single();

    if (!data) return;

    setWar(data);

    setTeam(
      data.team_one_name
    );
  }

  async function loadMembers() {

    const { data } =
      await supabase
        .from("profiles")
        .select(
          "id,username,nickname"
        )
        .order("username");

    setMembers(data || []);
  }

  async function loadTeamMembers() {

    const { data } =
      await supabase
        .from(
          "shiny_war_teams"
        )
        .select("*")
        .eq("war_id", id);

    setTeamMembers(
      data || []
    );
  }

  async function addMember() {

    const profile =
      members.find(
        (m) =>
          m.id ===
          selectedMember
      );

    if (!profile)
      return;

    await supabase
      .from(
        "shiny_war_teams"
      )
      .insert({
        war_id: id,

        member_id:
          profile.id,

        member_name:
          profile.nickname ||
          profile.username,

        team,
      });

    loadTeamMembers();
  }

  async function addManual() {

    if (!manualName)
      return;

    await supabase
      .from(
        "shiny_war_teams"
      )
      .insert({
        war_id: id,

        member_name:
          manualName,

        team,
      });

    setManualName("");

    loadTeamMembers();
  }

  async function moveMember(
    member: TeamMember
  ) {

    const newTeam =
      member.team ===
      war?.team_one_name
        ? war.team_two_name
        : war?.team_one_name;

    await supabase
      .from(
        "shiny_war_teams"
      )
      .update({
        team: newTeam,
      })
      .eq(
        "id",
        member.id
      );

    loadTeamMembers();
  }

  async function removeMember(
    memberId: string
  ) {

    const confirmDelete =
      window.confirm(
        "Remove member?"
      );

    if (!confirmDelete)
      return;

    await supabase
      .from(
        "shiny_war_teams"
      )
      .delete()
      .eq(
        "id",
        memberId
      );

    loadTeamMembers();
  }

  if (!war)
    return (
      <div className="page">
        Loading...
      </div>
    );

  const teamOne =
    teamMembers.filter(
      (m) =>
        m.team ===
        war.team_one_name
    );

  const teamTwo =
    teamMembers.filter(
      (m) =>
        m.team ===
        war.team_two_name
    );

  return (
    <div className="page">

      <h1>
        Manage Teams
      </h1>

      <div className="admin-form">

        <h2>
          Add Existing Member
        </h2>

        <select
          value={
            selectedMember
          }
          onChange={(e) =>
            setSelectedMember(
              e.target.value
            )
          }
        >
          <option value="">
            Select Member
          </option>

          {members.map(
            (member) => (
              <option
                key={
                  member.id
                }
                value={
                  member.id
                }
              >
                {member.nickname ||
                  member.username}
              </option>
            )
          )}
        </select>

        <select
          value={team}
          onChange={(e) =>
            setTeam(
              e.target.value
            )
          }
        >
          <option
            value={
              war.team_one_name
            }
          >
            {
              war.team_one_name
            }
          </option>

          <option
            value={
              war.team_two_name
            }
          >
            {
              war.team_two_name
            }
          </option>
        </select>

        <button
          className="submit-btn"
          onClick={
            addMember
          }
        >
          Add Member
        </button>

        <hr />

        <h2>
          Add Manual Name
        </h2>

        <input
          value={manualName}
          onChange={(e) =>
            setManualName(
              e.target.value
            )
          }
          placeholder="Name"
        />

        <button
          className="submit-btn"
          onClick={
            addManual
          }
        >
          Add Manual
        </button>

      </div>

      <div className="war-columns">

        {/* TEAM ONE */}

        <div className="war-column">

          <h2>
            ⭐{" "}
            {
              war.team_one_name
            }
          </h2>

          {teamOne.map(
            (member) => (
              <div
                key={
                  member.id
                }
                className="member-card"
              >
                <h3>
                  {
                    member.member_name
                  }
                </h3>

                <button
                  className="submit-btn"
                  onClick={() =>
                    moveMember(
                      member
                    )
                  }
                >
                  Move
                </button>

                <button
                  className="delete-btn"
                  onClick={() =>
                    removeMember(
                      member.id
                    )
                  }
                >
                  Remove
                </button>

              </div>
            )
          )}

        </div>

        {/* TEAM TWO */}

        <div className="war-column">

          <h2>
            🔥{" "}
            {
              war.team_two_name
            }
          </h2>

          {teamTwo.map(
            (member) => (
              <div
                key={
                  member.id
                }
                className="member-card"
              >
                <h3>
                  {
                    member.member_name
                  }
                </h3>

                <button
                  className="submit-btn"
                  onClick={() =>
                    moveMember(
                      member
                    )
                  }
                >
                  Move
                </button>

                <button
                  className="delete-btn"
                  onClick={() =>
                    removeMember(
                      member.id
                    )
                  }
                >
                  Remove
                </button>

              </div>
            )
          )}

        </div>

      </div>

    </div>
  );
}