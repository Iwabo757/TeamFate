          to="/admin/shiny-approvals"
          className="admin-card"
        >
          <div>
            <h2>📥 Pending Submissions: {pendingSubmissions}</h2>
            <p>
              {pendingSubmissions === 0
                ? "There are no shiny submissions waiting for review."
                : `You have ${pendingSubmissions} shiny ${pendingSubmissions === 1 ? "submission" : "submissions"} waiting for review.`}
              {" "}Open submissions to approve or reject them.
            </p>
          </div>
        </Link>

        <Link
          to="/admin/shinies/add"
          className="admin-card"
        >
          <div>
            <h2>➕ Add Shiny</h2>
            <p>
              Add a shiny directly to the
              Team Faté Shiny Dex.
            </p>
          </div>
        </Link>

        <Link
          to="/admin/shinies"
          className="admin-card"
        >
          <div>
            <h2>✨ Manage Shinies</h2>
            <p>
              Edit and remove shiny
              records.
            </p>
          </div>
        </Link>

        <Link
          to="/admin/shiny-approvals"
          className="admin-card"
        >
          <div>
            <h2>📥 Submissions</h2>
            <p>
              Review member shiny
              submissions and approve
              them into the dex.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
