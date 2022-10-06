import React from "react";
import useAxios from "axios-hooks";
import axios from "axios";
import { Navigate } from "react-router-dom";

import { formatName } from "../../util";
import AdminManager from "./AdminManager";

interface Props {
  user: any;
}

const AdminHome: React.FC<Props> = props => {
  const [{ data, loading, error }, refetch] = useAxios("/api/company");

  if (!props.user.admin) {
    return <Navigate to="/" />;
  }

  if (loading) {
    return <div>Loading</div>;
  }

  if (error) {
    return <div>Error</div>;
  }

  const handleSetScanner = async (company: any, user: any) => {
    const scannerID = prompt("Scanner ID:", user.scanners);
    if (scannerID === null) return;

    await axios.patch(
      `/api/company/${encodeURIComponent(company._id)}/employee/${encodeURIComponent(
        user.email
      )}/scanners/${encodeURIComponent(scannerID)}`
    );
    refetch();
  };

  const handleDeleteEmployee = async (company: any, user: any) => {
    if (!window.confirm(`Are you sure you want to delete ${company.name}?`)) return;

    await axios.delete(`/api/company/${encodeURIComponent(company._id)}`);
    refetch();
  };

  const handleConfirmEmployee = async (company: any, pendingUser: any) => {
    await axios.patch(
      `/api/company/${encodeURIComponent(company._id)}/employee/${encodeURIComponent(
        pendingUser.email || ""
      )}`
    );
    refetch();
  };

  const handleAddEmployee = async (company: any) => {
    let email = prompt("Email of employee:");
    if (!email) return;

    email = email.trim().toLowerCase();
    await axios.post(
      `/api/company/${encodeURIComponent(company._id)}/employee/${encodeURIComponent(email)}`
    );
    refetch();
  };

  const handleAddCompany = async () => {
    let name = prompt("Name of company:");
    if (!name) return;

    name = name.trim();
    await axios.post(`/api/company/${encodeURIComponent(name)}`);
    refetch();
  };

  const handleRenameCompany = async (company: any) => {
    const name = prompt("New name:", company.name);
    if (!name) return;

    await axios.patch(`/api/company/${encodeURIComponent(company._id)}`, {
      name: name.trim(),
    });
    refetch();
  };

  const handleResumeAccessCompany = async (company: any, hasResumeAccess: boolean) => {
    await axios.patch(`/api/company/${encodeURIComponent(company._id)}`, {
      hasResumeAccess: !hasResumeAccess,
    });
    window.location.reload();
  };

  const handleDeleteCompany = async (company: any) => {
    if (!window.confirm(`Are you sure you want to delete ${company.name}?`)) return;

    await axios.delete(`/api/company/${encodeURIComponent(company._id)}`);
    refetch();
  };

  return (
    <>
      <h1 className="title">Employers</h1>
      <h2 className="subtitle">
        Recruiters can be assigned to companies to view and collect resumes
      </h2>
      <button
        className="button is-info is-outlined"
        style={{ marginBottom: "10px" }}
        onClick={() => handleAddCompany()}
      >
        Add company
      </button>
      <section className="columns is-multiline">
        {data.companies.length === 0 ? (
          <div className="column is-half is-offset-one-quarter has-text-centered">
            <p>
              <em>No companies yet</em>
            </p>
          </div>
        ) : (
          data.companies.map((company: any) => (
            <div className="column is-half">
              <h1 className="title">{company.name}</h1>
              <ul>
                <li>
                  <strong>{company.visits.length}</strong> visits
                </li>
                <li>
                  <strong>{company.users.length}</strong> employee(s)
                </li>
                {company.users.length === 0 ? (
                  <li className="has-text-centered">
                    <em>No users</em>
                  </li>
                ) : (
                  company.users.map((user: any) => (
                    <li className="single-line-button">
                      <span className="icon">
                        <i className="fas fa-user-tie" />
                      </span>
                      <strong>{formatName(user.name)}</strong> ({user.email}
                      )&nbsp;&nbsp;|&nbsp;&nbsp;Scanner(s):
                      {!user.scannerIds || user.scannerIDs.length === 0 ? (
                        <em>None</em>
                      ) : (
                        <strong>{user.scannerIDs.join(",")}</strong>
                      )}
                      <button
                        className="button is-link is-outlined set-scanner"
                        onClick={() => handleSetScanner(company, user)}
                      >
                        Scanners
                      </button>
                      <button
                        className="button is-danger is-outlined remove-employee"
                        onClick={() => handleDeleteEmployee(company, user)}
                      >
                        Remove
                      </button>
                    </li>
                  ))
                )}
                {company.pendingUsers.length === 0 ? (
                  <li>
                    <hr />
                  </li>
                ) : (
                  company.pendingUsers.map((pendingUser: any) => (
                    <li className="single-line-button">
                      <span className="icon">
                        <i className="fas fa-user-clock" />
                      </span>
                      <strong>{formatName(pendingUser.name)}</strong> ({pendingUser.email})
                      <button
                        className="button is-success is-outlined confirm-employee"
                        onClick={() => handleConfirmEmployee(company, pendingUser)}
                      >
                        Confirm
                      </button>
                      <button
                        className="button is-danger is-outlined remove-employee"
                        onClick={() => handleDeleteEmployee(company, pendingUser)}
                      >
                        Delete
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <br />
              <div className="field is-grouped is-grouped-centered is-multiline">
                <p className="control">
                  <button
                    className="button is-success is-outlined add-employee"
                    onClick={() => handleAddEmployee(company)}
                  >
                    Add employee
                  </button>
                </p>
                <p className="control">
                  <button
                    className="button is-info is-outlined"
                    onClick={() => handleRenameCompany(company)}
                  >
                    Rename
                  </button>
                </p>
                <p className="control">
                  <button
                    className={`button ${
                      company.hasResumeAccess ? "is-danger" : "is-info"
                    } is-outlined`}
                    onClick={() => handleResumeAccessCompany(company, company.hasResumeAccess)}
                  >
                    {company.hasResumeAccess ? "Remove Resume Access" : "Give Resume Access"}
                  </button>
                </p>
                <p className="control">
                  <button
                    className="button is-danger is-outlined"
                    onClick={() => handleDeleteCompany(company)}
                  >
                    Delete
                  </button>
                </p>
              </div>
            </div>
          ))
        )}
      </section>

      <hr />

      <AdminManager />
    </>
  );
};

export default AdminHome;
