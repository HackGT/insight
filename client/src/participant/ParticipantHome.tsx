import React from "react";
import useAxios from "axios-hooks";

import { formatName } from "../util";
import SponsorInformation from "./SponsorInformation";

interface Props {
  user: any;
}

const ParticipantHome: React.FC<Props> = props => {
  const [{ data, loading, error }] = useAxios("/api/participant");

  if (loading) {
    return <div>Loading</div>;
  }

  if (error) {
    return <div>Error</div>;
  }

  console.log(data);

  return (
    <>
      <h1 className="title" style={{ textAlign: "center" }}>
        Hello, {formatName(props.user.name)}!
      </h1>
      <section className="columns">
        <div className="colum is-three-fifths is-offset-one-fifth" style={{ float: "left" }}>
          <h2 className="subtitle">Sponsors</h2>
          <SponsorInformation />
        </div>
        <div className="column is-two-fifths is-offset-one-fifth" style={{ float: "right" }}>
          <h2 className="subtitle">Personal Information</h2>
          <p className="content">
            <ul>
              <li>
                <strong>Name:</strong> {data.name}
              </li>
              <li>
                <strong>Email:</strong> {data.email}
              </li>
              <li>
                <strong>School:</strong> {data.university}
              </li>
              <li>
                <strong>Major:</strong> {data.major}
              </li>
              {data.fun1 && (
                <li>
                  <strong>{data.fun1}:</strong> {data.fun1Answer}
                </li>
              )}
              {data.fun2 && (
                <li>
                  <strong>{data.fun2}:</strong> {data.fun2Answer}
                </li>
              )}
            </ul>
          </p>
          <div className="content">
            {data.resume ? (
              <>
                <strong>Extracted resume content (used for searches):</strong>
                <textarea className="textarea" id="resume-text" readOnly>
                  {data.resumeText}
                </textarea>
              </>
            ) : (
              <>
                <br />
                <article className="message is-danger">
                  <div className="message-body">
                    <p>You don't currently have a resume uploaded!</p>
                    <p>
                      <strong>Reason:</strong> {data.resumeFailReason}
                    </p>
                  </div>
                </article>
              </>
            )}
          </div>

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
        </div>
      </section>
    </>
  );
};

export default ParticipantHome;
