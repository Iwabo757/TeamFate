import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { supabase } from "../lib/supabase";

interface Member {
  id: string;
  username: string;
  nickname: string;
}

export default function EditShinyWar() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [members, setMembers] =
    useState<Member[]>([]);

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [teamOneName, setTeamOneName] =
    useState("");

  const [teamTwoName, setTeamTwoName] =
    useState("");

  const [teamOneCaptain, setTeamOneCaptain] =
    useState("");

  const [teamTwoCaptain, setTeamTwoCaptain] =
    useState("");

  const [teamOneImage, setTeamOneImage] =
    useState("");

  const [teamTwoImage, setTeamTwoImage] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  useEffect(() => {
    loadMembers();

    if (id) {
      loadWar();
    }
  }, [id]);

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

  async function loadWar() {
    const { data } =
      await supabase
        .from("shiny_wars")
        .select("*")
        .eq("id", id)
        .single();

    if (!data) return;

    setTitle(
      data.title || ""
    );

    setDescription(
      data.description || ""
    );

    setTeamOneName(
      data.team_one_name || ""
    );

    setTeamTwoName(
      data.team_two_name || ""
    );

    setTeamOneCaptain(
      data.team_one_captain || ""
    );

    setTeamTwoCaptain(
      data.team_two_captain || ""
    );

    setTeamOneImage(
      data.team_one_image || ""
    );

    setTeamTwoImage(
      data.team_two_image || ""
    );

    setStartDate(
      data.start_date?.slice(
        0,
        16
      ) || ""
    );

    setEndDate(
      data.end_date?.slice(
        0,
        16
      ) || ""
    );
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

  async function saveWar() {
    const { error } =
      await supabase
        .from("shiny_wars")
        .update({
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
        })
        .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "Shiny War Updated"
    );

    navigate(
      "/admin/shinywars"
    );
  }

  return (
    <div className="page">

      <h1>
        ⚔️ Edit Shiny War
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
              marginBottom:
                "20px",
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
              marginBottom:
                "20px",
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
          onClick={saveWar}
        >
          Save Changes
        </button>

      </div>

    </div>
  );
}