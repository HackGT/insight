/* eslint-disable no-nested-ternary */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-underscore-dangle */
import axios from "axios";
import React, { useEffect, useState } from "react";
import { apiUrl, Service, useAuth } from "@hex-labs/core";

import PDFContainer from "./PDFContainer";
import { handleAddVisit, generateTag, tagButtonHandler, handleDeleteVisit } from "./util";

interface Props {
  participant: any;
  visitData: any;
  setDetailModalInfo: React.Dispatch<any>;
  fetchData: () => void;
}

const ParticipantModal: React.FC<Props> = props => {
  const [link, setLink] = useState({
    url: "",
    withCredentials: false,
  });
  const downloadDisabled = link.url === "";

  useEffect(() => {
    // Get a time-limited public link to the resume for use with Google / Microsoft viewer
    const options: RequestInit = {
      method: "GET",
      credentials: "include",
    };

    async function getResumeLink() {
      if (!props.participant?.resume) return;

      try {
        const response = await fetch(`/${props.participant.resume?.path}?public=true`, options);
        const json = await response.json();

        if (!json.success) {
          alert(json.error);
        }

        // setLink(`localhost:3000/uploads/${json.link}&download=true`);
        // setResumeDownloadLink(`http://localhost:3000/uploads/${json.link}&download=true`);

        setLink({
          url: `${new URL(window.location.href).origin}/uploads/${json.link}&download=true`,
          withCredentials: true,
        });

        // if (props.participant.resume.path.toLowerCase().indexOf(".doc") !== -1) {
        //   // Special viewer for Word documents
        //   this.resume.src = `${link}`;
        // } else {
        //   // Google Drive Viewer supports a bunch of formats including PDFs, Pages, images
        //   this.resume.src = `${link}`;
        // }
      } catch (err) {
        console.log(err);
      }
    }

    getResumeLink();
  }, [props, props.participant]);

  const handleAddNote = async () => {
    const note = (prompt("New note:") || "").trim();
    if (!note) return;

    await axios.put(
      apiUrl(Service.HEXATHONS, `/sponsor-visit/${props.visitData.id}`),
      {
        notes: [...props.visitData.notes, note]
      }
    );

    props.fetchData();
  };

  const handleDeleteNote = async (note: any) => {
    if (!window.confirm("Are you sure that you want to delete this note?")) return;

    await axios.put(
      apiUrl(Service.HEXATHONS, `/sponsor-visit/${props.visitData.id}`),
      {
        notes: props.visitData.notes.filter((n: any) => n != note)
      }
    );

    props.fetchData();
  };

  if (props.participant == null) {
    return null;
  }

  return (
    <article className={`modal ${props.participant && "is-active"}`}>
      <div className="modal-background" />
      <div className="modal-card">
        <header className="modal-card-head">
          <div className="modal-title">
            <h1 className="title" id="detail-name">
              {props.participant.name}
            </h1>
            <h2 className="subtitle" id="detail-major">
              {props.participant.major || "Unknown"}
            </h2>
          </div>
          <button
            className="delete"
            aria-label="close"
            onClick={() => props.setDetailModalInfo(null)}
          />
        </header>
        <section className="modal-card-body">
          <div className="columns">
            <div className="column">
              <h4 className="title is-4">Your notes</h4>
              <div className="side-by-side-flex">
                <strong>Tags:</strong>
                <div className="field is-grouped is-grouped-multiline" id="detail-tags">
                  {props.visitData &&
                    props.visitData.tags.map((tag: string) =>
                      generateTag(props.visitData, tag, props.fetchData)
                    )}
                </div>
              </div>
              <p>
                <strong>Notes:</strong>
                <ul id="detail-notes">
                  {props.visitData &&
                    props.visitData.notes.map((note: string) => (
                      <li>
                        <span>{note}</span>
                        <button
                          className="button is-small is-danger is-outlined"
                          onClick={() => handleDeleteNote(note)}
                        >
                          <span className="icon is-small">
                            <i className="fas fa-trash-alt" />
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </p>
            </div>
            <div className="column">
              <h4 className="title is-4">Resume</h4>

              {props.participant.resume &&
                props.participant.resume.path.toLowerCase().indexOf(".pdf") >= 0 ? (
                <PDFContainer link={link} />
              ) : props.participant.resume ? (
                'Unable to render resume. Click "Download Resume" below to view the file.'
              ) : (
                "This participant does not have a resume on file or it is still being processed. Try again in 30 minutes."
              )}
            </div>
          </div>
        </section>
        <footer className="modal-card-foot">
          <div className="buttons">
            <button
              onClick={() => {
                location.href = link.url;
              }}
              type="button"
              className="button is-info"
              disabled={downloadDisabled}
            >
              <span className="icon is-small">
                <i className="fas fa-download" />
              </span>
              <span>Download Resume</span>
            </button>
            {props.visitData ? (
              <button
                className="button is-danger"
                onClick={() => handleDeleteVisit(props.visitData, props.fetchData)}
              >
                <span className="icon is-small">
                  <i className="fas fa-trash-alt" />
                </span>
                <span>Delete visit</span>
              </button>
            ) : (
              <button
                className="button is-info"
                onClick={() => handleAddVisit(props.participant, props.fetchData)}
              >
                <span className="icon is-small">
                  <i className="fas fa-plus" />
                </span>
                <span>Add to visits</span>
              </button>
            )}
            <span className="spacer" />
            {props.visitData && (
              <>
                <button
                  className="button is-warning"
                  onClick={() => tagButtonHandler(props.visitData, "starred", props.fetchData)}
                >
                  <span className="icon is-small">
                    <i className="fas fa-star" />
                  </span>
                  <span>Star</span>
                </button>
                <button
                  className="button is-success"
                  onClick={() => tagButtonHandler(props.visitData, "flagged", props.fetchData)}
                >
                  <span className="icon is-small">
                    <i className="fas fa-flag" />
                  </span>
                  <span>Flag</span>
                </button>
                <button
                  className="button is-info"
                  onClick={() => tagButtonHandler(props.visitData, "", props.fetchData)}
                >
                  <span className="icon is-small">
                    <i className="fas fa-plus" />
                  </span>
                  <span>Add tag</span>
                </button>
                <button className="button is-dark" onClick={() => handleAddNote()}>
                  <span className="icon is-small">
                    <i className="fas fa-plus" />
                  </span>
                  <span>Add note</span>
                </button>
              </>
            )}

            <span className="spacer" />
            <button
              className="button"
              id="detail-close"
              onClick={() => props.setDetailModalInfo(null)}
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </article>
  );
};

export default ParticipantModal;
