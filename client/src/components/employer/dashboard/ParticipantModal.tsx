/* eslint-disable no-underscore-dangle */
import axios from "axios";
import React from "react";

import ResumerViewer from "./ResumerViewer";
import { handleAddVisit, generateTag, tagButtonHandler, handleDeleteVisit } from "./util";

interface Props {
  participant: any;
  setDetailModalInfo: React.Dispatch<any>;
  fetchData: () => void;
}

const ParticipantModal: React.FC<Props> = props => {
  const visitData = props.participant?.visitData;

  const handleAddNote = async () => {
    const note = (prompt("New note:") || "").trim();
    if (!note) return;

    await axios.post(`/api/visit/${visitData._id}/note`, { note });
    props.fetchData();
  };

  const handleDeleteNote = async (note: any) => {
    if (!window.confirm("Are you sure that you want to delete this note?")) return;

    await axios.delete(`/api/visit/${visitData._id}/note`, { data: { note } });
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
          {visitData && (
            <div className="columns">
              <div className="column">
                <h4 className="title is-4">Your notes</h4>
                <div className="side-by-side-flex">
                  <strong>Tags:</strong>
                  <div className="field is-grouped is-grouped-multiline" id="detail-tags">
                    {visitData.tags.map((tag: string) =>
                      generateTag(visitData, tag, props.fetchData)
                    )}
                  </div>
                </div>
                <p>
                  <strong>Notes:</strong>
                  <ul id="detail-notes">
                    {visitData.notes.map((note: string) => (
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
            </div>
          )}
          <ResumerViewer participant={props.participant} />
        </section>
        <footer className="modal-card-foot">
          <div className="buttons">
            {visitData ? (
              <button
                className="button is-danger"
                onClick={() => handleDeleteVisit(visitData, props.fetchData)}
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
            {visitData && (
              <>
                <button
                  className="button is-warning"
                  onClick={() => tagButtonHandler(visitData, "starred", props.fetchData)}
                >
                  <span className="icon is-small">
                    <i className="fas fa-star" />
                  </span>
                  <span>Star</span>
                </button>
                <button
                  className="button is-success"
                  onClick={() => tagButtonHandler(visitData, "flagged", props.fetchData)}
                >
                  <span className="icon is-small">
                    <i className="fas fa-flag" />
                  </span>
                  <span>Flag</span>
                </button>
                <button
                  className="button is-info"
                  onClick={() => tagButtonHandler(visitData, "", props.fetchData)}
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
