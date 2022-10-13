/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import axios from "axios";
import useAxios from "axios-hooks";
import React, { useEffect, useRef, useState } from "react";
import { apiUrl, Service, useAuth } from "@hex-labs/core";
// import Editor from "rich-markdown-editor";

import { formatName } from "../../../../util";

interface Props {
  user: any;
  company: any;
  companyRefetch: any;
}

const ManageEmployees: React.FC<Props> = props => {
  const { company } = props

  const [description, setDescription] = useState(company.description)

  const handleRemoveEmployee = async (user: any) => {
    if (!window.confirm(`Are you sure you want to remove ${user.name}?`)) return;

    await axios.delete(
      apiUrl(Service.USERS, `/companies/${company.id}/employees`),
      {
        data: {
          userId: user.id
        }
      }
    )
    props.companyRefetch();
  };

  const handleConfirmEmployee = async (user: any) => {
    if (
      !window.confirm(
        `Are you sure you want to add ${user.name} as an employee? They will have full access to your collected resumes and notes.`
      )
    )
      return;

    await axios.post(
      apiUrl(Service.USERS, `/companies/${company.id}/employees/accept-request`),
      {
        employeeId: user.uid
      }
    );
    props.companyRefetch();
  };

  const handleEditDescription = async () => {
    await axios.put(
      apiUrl(Service.USERS, `/companies/${company.id}`), {
      description
    }
    );
    props.companyRefetch();
  };

  return (
    <>
      <div className="columns">
        <div className="column is-half">
          <h1 className="title">Employees</h1>
          <h6 className="subtitle is-6">All the employees registered under your company.</h6>
          <ul>
            {props.company.employees?.map((emp: any) => (
              <li className="single-line-button">
                <span className="icon">
                  <i className="fas fa-user-tie" />
                </span>
                <strong>{formatName(emp.name)}</strong> ({emp.email})&nbsp;&nbsp;
                {/* <button className="button is-link is-outlined set-scanner" data-company="{{../user.company.name}}"
									data-email="{{this.email}}" data-scanners="{{join this.company.scannerIDs}}">Scanners</button> */}
                {emp.id !== props.user.id && (
                  <button
                    className="button is-danger is-outlined "
                    onClick={() => handleRemoveEmployee(emp)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          {props.company.pendingEmployees?.length > 0 && (
            <>
              <br />
              <h5 className="title is-5">Pending Employee Requests</h5>
              <ul>
                {props.company.pendingEmployees.map((pendingUser: any) => (
                  <li className="single-line-button">
                    <span className="icon">
                      <i className="fas fa-user-clock" />
                    </span>
                    <strong>{formatName(pendingUser.name)}</strong> ({pendingUser.email})
                    <button
                      className="button is-success is-outlined"
                      onClick={() => handleConfirmEmployee(pendingUser)}
                    >
                      Confirm
                    </button>
                    <button
                      className="button is-danger is-outlined"
                      onClick={() => handleRemoveEmployee(pendingUser)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

      </div>
      <h1 className="title">Description</h1>
      <h6 className="subtitle is-6">
        {company.description}
      </h6>
      <textarea value={description} onChange={e =>
        setDescription(e.target.value)
      } />
      <button className="button is-info is-outlined" onClick={() => handleEditDescription()}>
        Update Description
      </button>
    </>
  );
};

export default ManageEmployees;
