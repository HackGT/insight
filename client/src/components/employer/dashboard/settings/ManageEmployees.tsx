/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import axios from "axios";
import useAxios from "axios-hooks";
import React from "react";
import Editor from "rich-markdown-editor";

import { formatName } from "../../../../util";

interface Props {
  user: any;
}

const ManageEmployees: React.FC<Props> = props => {
  const companyId = props.user.company.company;
  const [{ data, loading, error }, refetch] = useAxios(`/api/company/${companyId}`);

  if (loading) {
    return <div>Loading</div>;
  }

  if (error) {
    return <div>Error</div>;
  }

  const handleRemoveEmployee = async (email: any) => {
    if (!window.confirm(`Are you sure you want to remove ${email}?`)) return;

    await axios.delete(
      `/api/company/${encodeURIComponent(companyId || "")}/employee/${encodeURIComponent(
        email || ""
      )}`
    );
    refetch();
  };

  const handleConfirmEmployee = async (email: any) => {
    if (
      !window.confirm(
        `Are you sure you want to add ${email} as an employee? They will have full access to your collected resumes and notes.`
      )
    )
      return;

    await axios.patch(
      `/api/company/${encodeURIComponent(companyId || "")}/employee/${encodeURIComponent(
        email || ""
      )}`
    );
    refetch();
  };

  const handleEditCall = async (callId: string) => {
    const title = (prompt("New title:") || "").trim();

    if (!title) return;

    await axios.patch(`/api/company/${companyId}/call/${callId}`, { title });
    refetch();
  };

  return (
    <div className="columns">
      <div className="column is-half">
        <h1 className="title">Employees</h1>
        <ul>
          {data.users?.map((user: any) => (
            <li className="single-line-button">
              <span className="icon">
                <i className="fas fa-user-tie" />
              </span>
              <strong>{formatName(user.name)}</strong> ({user.email})&nbsp;&nbsp;
              {/* <button className="button is-link is-outlined set-scanner" data-company="{{../user.company.name}}"
									data-email="{{this.email}}" data-scanners="{{join this.company.scannerIDs}}">Scanners</button> */}
              {user.uuid !== props.user.uuid && (
                <button
                  className="button is-danger is-outlined "
                  onClick={() => handleRemoveEmployee(user.email)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        {data.pendingUsers?.length > 0 && (
          <>
            <br />
            <h5 className="title is-5">Pending Employee Requests</h5>
            <ul>
              {data.pendingUsers.map((pendingUser: any) => (
                <li className="single-line-button">
                  <span className="icon">
                    <i className="fas fa-user-clock" />
                  </span>
                  <strong>{formatName(pendingUser.name)}</strong> ({pendingUser.email})
                  <button
                    className="button is-success is-outlined"
                    onClick={() => handleConfirmEmployee(pendingUser.email)}
                  >
                    Confirm
                  </button>
                  <button
                    className="button is-danger is-outlined"
                    onClick={() => handleRemoveEmployee(pendingUser.email)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <h1 className="title">Sponsor Fair Calls</h1>
        <ul>
          {data.company.calls.map((call: any) => (
            <li className="single-line-button">
              {call.title}
              <span className="icon">
                <i className="fas fa-pen" onClick={() => handleEditCall(call._id)} />
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h1 className="title">Description</h1>
        <div className="columns" style={{ border: "2px", borderColor: "black", width: "500px" }}>
          <Editor defaultValue={data.company.description} />
        </div>
      </div>
    </div>
  );
};

export default ManageEmployees;
