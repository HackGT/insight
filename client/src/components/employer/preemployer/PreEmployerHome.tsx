import axios from "axios";
import useAxios from "axios-hooks";
import React, { useState } from "react";
import { apiUrl, ErrorScreen, LoadingScreen, Service, useAuth } from "@hex-labs/core";

import { formatName } from "../../../util";

interface Props {
  user: any;
  companyRefetch: any;
}

const PreEmployerHome: React.FC<Props> = props => {
  const { user, companyRefetch } = props

  const [{ data, loading, error }, refetch] = useAxios({
    method: "GET",
    url: apiUrl(Service.USERS, "/companies/")
  });
  const [selectedCompany, setSelectedCompany] = useState<string>("default");

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={undefined} />;;
  }

  const handleSelectCompany = async () => {
    if (!selectedCompany || selectedCompany === "default") return;
    const existingRequest = data[selectedCompany].pendingEmployees.filter((emp: { userId: any; }) => emp.userId == user.userId)
    const existingEmployee = data[selectedCompany].employees.filter((emp: { userId: any; }) => emp.userId == user.userId)
    if (existingRequest.length != 0 || existingEmployee.length != 0) {
      window.alert("Already requested!")
      return
    }
    await axios.post(apiUrl(Service.USERS, `/companies/${data[selectedCompany].id}/employees/request`));
    window.alert("Successfully requested!")
    refetch()
  };

  const handleLogOut = async () => {
    await axios.get(apiUrl(Service.AUTH, `/auth/logout`));
    window.alert("Successfully logged out")
    window.location.href = `https://login.hexlabs.org?redirect=${window.location.href}`;
  }

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
                    {data.map((company: any, index: number) => (
                      <option value={index}>{company.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="control">
                <button className="button" onClick={() => handleSelectCompany()}>
                  Request to join
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
        <p className="control">
          <button className="button" onClick={() => handleLogOut()}>
            Logout
          </button>
        </p>
      </div>
    </>
  );
};

export default PreEmployerHome;
