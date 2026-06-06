import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface Member {
  id: string;
  nickname: string;
  username: string;
}

export default function CreateShinyWar() {
  const navigate = useNavigate();

  const [members, setMembers] =
    useState<Member[]>([]);

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [teamOneName, setTeamOneName] =
    useState("Team Jirachi");

  const [teamTwoName, setTeamTwoName] =
    useState("Team Victini");

  const [teamOneCaptain, setTeamOneCaptain] =
    useState("");

  const [teamTwoCaptain, setTeamTwoCaptain] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [teamOneImage, setTeamOneImage] =
    useState("");

  const [teamTwoImage, setTeamTwoImage] =
    useState("");

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    const { data } = await supabase
      .from("profiles")
      .select("id,nickname,username")
      .order("username");

    setMembers(data || []);
  }

  async function uploadImage(
    file: File,
    folder: string
  ) {
    const fileName =
      `${Date.now()}-${file.name}`;

    const filePath =
      `${folder}/${fileName}`;

    const { error } =
      await supabase.storage
        .from("shinywars")
        .upload(
          filePath,
          file,
          {
            upsert: true,
          }
        );

    if (error) {
      throw error;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from("shinywars")
      .getPublicUrl(
        filePath
      );

    return publicUrlData.publicUrl;
  }

  async function handleTeamOneUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      e.target.files?.[0];

    if (!file) return;

    try {
      const url =
        await uploadImage(
          file,
          "team-one"
        );

      setTeamOneImage(url);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleTeamTwoUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      e.target.files?.[0];

    if (!file) return;

    try {
      const url =
        await uploadImage(
          file,
          "team-two"
        );

      setTeamTwoImage(url);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function createWar() {
    if (!title.trim()) {
      alert(
        "Enter a title"
      );
      return;
    }

    const { data, error } =
      await supabase
        .from("shiny_wars")
        .insert({
          title,
          description,

          team_one_name:
            teamOneName,

          team_two_name:
            teamTwoName,

          team_one_captain:
            teamOneCaptain ||
            null,

          team_two_captain:
            teamTwoCaptain ||
            null,

          team_one_image:
            teamOneImage,

          team_two_image:
            teamTwoImage,

          start_date:
            new Date(
              startDate
            ).toISOString(),

          end_date:
            new Date(
              endDate
            ).toISOString(),

          active: true,
        })
        .select()
        .single();

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "Shiny War Created"
    );

    navigate(
      `/admin/shinywars/teams/${data.id}`
    );
  }

  return (
    <div className="page">
      <h1>
        ⚔️ Create Shiny War
      </h1>

      <div className="admin-form">

        <input
          value={title}
          onChange={(e) =>
            setTitle(
              e.target.value
            )
          }
          placeholder="War Title"
        />

        <textarea
          value={description}
          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }
          placeholder="Description"
        />

        <input
          value={teamOneName}
          onChange={(e) =>
            setTeamOneName(
              e.target.value
            )
          }
          placeholder="Team One Name"
        />

        <input
          value={teamTwoName}
          onChange={(e) =>
            setTeamTwoName(
              e.target.value
            )
          }
          placeholder="Team Two Name"
        />

        <label>
          Team One Image
        </label>

        <input
          type="file"
          accept="image/*"
          onChange={
            handleTeamOneUpload
          }
        />

        {teamOneImage && (
          <img
            src={teamOneImage}
            alt="Team One"
            style={{
              width: "150px",
              borderRadius:
                "10px",
            }}
          />
        )}

        <label>
          Team Two Image
        </label>

        <input
          type="file"
          accept="image/*"
          onChange={
            handleTeamTwoUpload
          }
        />

        {teamTwoImage && (
          <img
            src={teamTwoImage}
            alt="Team Two"
            style={{
              width: "150px",
              borderRadius:
                "10px",
            }}
          />
        )}

        <label>
          Team One Captain
        </label>

        <select
          value={
            teamOneCaptain
          }
          onChange={(e) =>
            setTeamOneCaptain(
              e.target.value
            )
          }
        >
          <option value="">
            Select Captain
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

        <label>
          Team Two Captain
        </label>

        <select
          value={
            teamTwoCaptain
          }
          onChange={(e) =>
            setTeamTwoCaptain(
              e.target.value
            )
          }
        >
          <option value="">
            Select Captain
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

        <label>
          Start Date
        </label>

        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) =>
            setStartDate(
              e.target.value
            )
          }
        />

        <label>
          End Date
        </label>

        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) =>
            setEndDate(
              e.target.value
            )
          }
        />

        <button
          className="submit-btn"
          onClick={createWar}
        >
          Create War
        </button>

      </div>
    </div>
  );
}