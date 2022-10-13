import React, { useEffect, useState } from "react";
import useAxios from "axios-hooks";
import axios from "axios";
import { Navigate } from "react-router-dom";

import { formatName } from "../../util";
// import AdminManager from "./AdminManager";
import { apiUrl, Service, useAuth } from "@hex-labs/core";

interface Props {
  user: any;
}

const AdminHome: React.FC<Props> = props => {

  const [{ data, loading, error }, refetch] = useAxios({
    method: "GET",
    url: apiUrl(Service.USERS, "/companies/")
  });

  // if (!userData.admin) {
  //   return <Navigate to="/" />;
  // }

  if (loading) {
    return <div>Loading</div>;
  }

  if (error) {
    return <div>Error</div>;
  }


  const handleDeleteEmployee = async (company: any, user: any) => {
    console.log("in delete emp")
    console.log(user)
    console.log(company)
    if (!window.confirm(`Are you sure you want to delete ${formatName(user.name)} from ${company.name}?`)) return;

    await axios.delete(
      apiUrl(Service.USERS, `/companies/${company.id}/employees`),
      {
        data: {
          userId: user.userId
        }
      }
    );

    refetch();
  };

  const handleConfirmEmployee = async (company: any, pendingUser: any) => {
    await axios.post(
      apiUrl(Service.USERS, `/companies/${company.id}/employees/accept-request`),
      {
        employeeId: pendingUser.userId
      }
    );
    refetch();
  };

  const handleAddEmployee = async (company: any) => {
    let email = prompt("Email of employee:");
    if (!email) return;

    email = email.trim().toLowerCase();
    await axios.post(
      apiUrl(Service.USERS, `/companies/${company.id}/employees/add`), {
      employees: email
    },
    );
    refetch();
  };

  const handleAddCompany = async () => {
    let name = prompt("Name of company:");
    if (!name) return;

    name = name.trim();
    await axios.post(
      apiUrl(Service.USERS, `/companies/`),
      {
        name,
        hexathon: process.env.REACT_APP_HEXATHON_ID,
      }
    );
    refetch();
  };

  const handleRenameCompany = async (company: any) => {
    const name = prompt("New name:", company.name);
    if (!name) return;

    await axios.put(
      apiUrl(Service.USERS, `/companies/${company.id}`), {
      name,
    }
    );
    refetch();
  };

  const handleResumeAccessCompany = async (company: any, hasResumeAccess: boolean) => {
    await axios.put(
      apiUrl(Service.USERS, `/companies/${company.id}`), {
      hasResumeAccess
    }
    );
    window.location.reload();
  };

  const handleDeleteCompany = async (company: any) => {
    if (!window.confirm(`Are you sure you want to delete ${company.name}?`)) return;

    await axios.delete(
      apiUrl(Service.USERS, `/companies/${company.id}`)
    );
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
        {data.length === 0 ? (
          <div className="column is-half is-offset-one-quarter has-text-centered">
            <p>
              <em>No companies yet</em>
            </p>
          </div>
        ) : (
          data.map((company: any) => (
            <div className="column is-half">
              <h1 className="title">{company.name}</h1>
              <ul>
                {/* <li>
                  <strong>{company.visits.length}</strong> visits
                </li> */}
                <li>
                  <strong>{company.employees.length}</strong> employee(s)
                </li>
                {company.employees.length === 0 ? (
                  <li className="has-text-centered">
                    <em>No Employees</em>
                  </li>
                ) : (
                  company.employees.map((emp: any) => (
                    <li className="single-line-button">
                      <span className="icon">
                        <i className="fas fa-user-tie" />
                      </span>
                      <strong>{formatName(emp.name)}</strong> ({emp.email})
                      <button
                        className="button is-danger is-outlined remove-employee"
                        onClick={() => handleDeleteEmployee(company, emp)}
                      >
                        Remove
                      </button>
                    </li>
                  ))
                )}
                {company.pendingEmployees.length === 0 ? (
                  <li>
                    <hr />
                  </li>
                ) : (
                  company.pendingEmployees.map((pendingUser: any) => (
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
                    className={`button ${company.hasResumeAccess ? "is-danger" : "is-info"
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

      {/* <AdminManager /> */}
    </>
  );
};

export default AdminHome;
