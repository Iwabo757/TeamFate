import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function SubmitShiny() {
  const [pokemonName, setPokemonName] = useState("");
  const [nickname, setNickname] = useState("");
  const [region, setRegion] = useState("");
  const [method, setMethod] = useState("");
  const [catchDate, setCatchDate] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [ivScreenshotUrl, setIvScreenshotUrl] = useState("");

  async function handleSubmit() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login.");
      return;
    }

    const { error } = await supabase
      .from("shiny_submissions")
      .insert({
        user_id: user.id,
        pokemon_name: pokemonName,
        nickname,
        region,
        method,
        catch_date: catchDate,
        notes,
        screenshot_url: screenshotUrl,
        iv_screenshot_url: ivScreenshotUrl,
        status: "pending",
      });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Shiny submitted for approval!");

    setPokemonName("");
    setNickname("");
    setRegion("");
    setMethod("");
    setCatchDate("");
    setNotes("");
    setScreenshotUrl("");
    setIvScreenshotUrl("");
  }

  return (
    <div className="page">
      <h1>✨ Submit Shiny</h1>

      <div className="card">
        <div className="winner-editor">

          <input
            className="dex-select"
            placeholder="Pokemon"
            value={pokemonName}
            onChange={(e) =>
              setPokemonName(e.target.value)
            }
          />

          <input
            className="dex-select"
            placeholder="Nickname (optional)"
            value={nickname}
            onChange={(e) =>
              setNickname(e.target.value)
            }
          />

          <select
            className="dex-select"
            value={region}
            onChange={(e) =>
              setRegion(e.target.value)
            }
          >
            <option value="">
              Select Region
            </option>

            <option>Kanto</option>
            <option>Johto</option>
            <option>Hoenn</option>
            <option>Sinnoh</option>
            <option>Unova</option>
          </select>

          <input
            className="dex-select"
            placeholder="Method"
            value={method}
            onChange={(e) =>
              setMethod(e.target.value)
            }
          />

          <input
            type="date"
            className="dex-select"
            value={catchDate}
            onChange={(e) =>
              setCatchDate(e.target.value)
            }
          />

          <input
            className="dex-select"
            placeholder="Pokemon Screenshot URL"
            value={screenshotUrl}
            onChange={(e) =>
              setScreenshotUrl(e.target.value)
            }
          />

          <input
            className="dex-select"
            placeholder="IV Screenshot URL"
            value={ivScreenshotUrl}
            onChange={(e) =>
              setIvScreenshotUrl(e.target.value)
            }
          />

          <textarea
            className="dex-select"
            rows={4}
            placeholder="Notes"
            value={notes}
            onChange={(e) =>
              setNotes(e.target.value)
            }
          />

          <button
            className="save-winners-btn"
            onClick={handleSubmit}
          >
            Submit Shiny
          </button>
        </div>
      </div>
    </div>
  );
}