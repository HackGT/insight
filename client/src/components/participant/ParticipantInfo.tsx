import React from "react";
import useAxios from "axios-hooks";
import { Navigate } from "react-router-dom";

import { formatName } from "../../util";

interface Props {
  user: any;
}

const ParticipantInfo: React.FC<Props> = props => {
  const { user } = props
  // const [{ data, loading, error }] = useAxios("/api/participant");

  // if (loading) {
  //   return <div>Loading</div>;
  // }

  // if (error) {
  //   return <div>Error</div>;
  // }

  // if (!data) {
  //   return (
  //     <h2 className="subtitle" style={{ textAlign: "center" }}>
  //       Hello, your participant data has not been processed yet. Please check back in approximately
  //       30 min.
  //     </h2>
  //   );
  // }

  return (
    <>
      <h1 className="title" style={{ textAlign: "center" }}>
        Hello, {formatName(user.name)}!
      </h1>
      <section className="columns">
        <div className="column is-two-fifths is-offset-one-fifth" style={{ float: "right" }}>
          <h2 className="subtitle">Personal Information</h2>
          <p className="content">
            <ul>
              <li>
                <strong>Name:</strong> {formatName(user.name)}
              </li>
              <li>
                <strong>Email:</strong> {user.email}
              </li>
              {/* <li>
                <strong>School:</strong> {user.university}
              </li>
              <li>
                <strong>Major:</strong> {user.major}
              </li>
              {user.fun1 && (
                <li>
                  <strong>{user.fun1}:</strong> {user.fun1Answer}
                </li>
              )}
              {user.fun2 && (
                <li>
                  <strong>{user.fun2}:</strong> {user.fun2Answer}
                </li>
              )} */}
            </ul>
          </p>
          <div className="content">
            {user.resume ? (
              <p>Display resume here</p>
              // <>
              //   <strong>Extracted resume content (used for searches):</strong>
              //   <textarea className="textarea" id="resume-text" readOnly>
              //     {user.resumeText}
              //   </textarea>
              // </>
            ) : (
              <>
                <br />
                <article className="message is-danger">
                  <div className="message-body">
                    <p>You don't currently have a resume uploaded!</p>
                    {/* <p>
                      <strong>Reason:</strong> {user.resumeFailReason}
                    </p> */}
                  </div>
                </article>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default ParticipantInfo;
