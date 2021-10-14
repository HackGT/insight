import axios from "axios";
import useAxios from "axios-hooks";
import React, { useState } from "react";

import { formatName } from "../util";

interface Props {
  user: any;
}

const PreEmployerHome: React.FC<Props> = props => {
  const [{ data, loading, error }] = useAxios("/api/company");
  const [selectedCompany, setSelectedCompany] = useState<string>(props.user.company?.name || "");

  if (loading) {
    return <div>Loading</div>;
  }

  if (error) {
    return <div>Error</div>;
  }

  const handleSelectCompany = async () => {
    if (!selectedCompany) return;

    await axios.post(`/api/company/${encodeURIComponent(selectedCompany)}/join`);
    window.location.reload();
  };

  return (
    <>
      <section className="columns">
        <div className="column is-half is-offset-one-quarter">
          <h1 className="title">Hello, {formatName(props.user.name)}!</h1>
          <h2 className="subtitle">{props.user.email}</h2>
          <p>In order to start using Insight, you'll need to be associated with company.</p>
          {props.user.company?.name && (
            <>
              <br />
              <article className="message is-info">
                <div className="message-body">
                  You're currently pending approval to join{" "}
                  <strong>{props.user.company.name}</strong>.
                </div>
              </article>
            </>
          )}
          <p className="content">
            <div className="field has-addons">
              <div className="control is-expanded">
                <div className="select is-fullwidth">
                  <select
                    id="company-request"
                    value={selectedCompany}
                    onChange={event => setSelectedCompany(event.target.value)}
                  >
                    {data.companies.length === 0 ? (
                      <option disabled selected>
                        No data.companies available
                      </option>
                    ) : (
                      <option disabled selected>
                        Please select
                      </option>
                    )}
                    {data.companies.map((company: any) => (
                      <option
                        value={company.name}
                        selected={company.name === props.user.company?.name}
                      >
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="control">
                <button className="button" onClick={() => handleSelectCompany()}>
                  {props.user.company?.name ? "Change company" : "Request to join"}
                </button>
              </div>
            </div>
          </p>
          <p className="content">
            Requests to join a company can be approved by existing members of your company or by
            HackGT staff.
          </p>
        </div>
      </section>

      <br />
      <div className="field is-grouped is-grouped-centered">
        {props.user.admin && (
          <p className="control">
            <a className="button is-medium" href="/admin">
              Admin Settings
            </a>
          </p>
        )}
        <p className="control">
          <a className="button is-medium" href="/logout">
            Log out
          </a>
        </p>
      </div>
    </>
  );
};

export default PreEmployerHome;
