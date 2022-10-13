import axios from "axios";
import useAxios from "axios-hooks";
import React, { useState } from "react";
import { apiUrl, Service, useAuth } from "@hex-labs/core";

import { formatName } from "../../../util";

interface Props {
  user: any;
  companyRefetch: any;
}

const PreEmployerHome: React.FC<Props> = props => {
  const [{ data, loading, error }, refetch] = useAxios({
    method: "GET",
    url: apiUrl(Service.USERS, "/companies/")
  });
  const [selectedCompany, setSelectedCompany] = useState<string>("default");

  if (loading) {
    return <div>Loading</div>;
  }

  if (error) {
    return <div>Error</div>;
  }

  const handleSelectCompany = async () => {
    if (!selectedCompany || selectedCompany === "default") return;
    console.log("selected company", selectedCompany);
    await axios.post(apiUrl(Service.USERS, `/companies/${selectedCompany}/employees/request`));
    window.location.reload();
  };

  return (
    <>
      <section className="columns">
        <div className="column is-half is-offset-one-quarter">
          <h1 className="title">Hello, {formatName(props.user.name)}!</h1>
          <h2 className="subtitle">{props.user.email}</h2>
          <p>In order to start using Insight, you'll need to be associated with company.</p>
          <p className="content">
            <div className="field has-addons">
              <div className="control is-expanded">
                <div className="select is-fullwidth">
                  <select
                    id="company-request"
                    value={selectedCompany}
                    onChange={event => setSelectedCompany(event.target.value)}
                  >
                    {data.length === 0 ? (
                      <option disabled value="default">
                        No companies available
                      </option>
                    ) : (
                      <option disabled value="default">
                        Please select
                      </option>
                    )}
                    {data.map((company: any) => (
                      <option value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="control">
                {data.map((company: any) => (

                  <button className="button" onClick={() => handleSelectCompany()}>
                    Request to join
                  </button>
                )
                )}

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
