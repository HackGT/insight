/* eslint-disable no-param-reassign */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable no-underscore-dangle */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable react/react-in-jsx-scope */
import axios from "axios";

export const generateTag = (visitData: any, tag: string, fetchData?: any) => {
  const deleteTag = async () => {
    await axios.delete(`/api/visit/${visitData._id}/tag`, {
      data: {
        tag,
      },
    });
    fetchData && fetchData();
  };

  return (
    <div className="control">
      <div className="tags has-addons">
        <span
          className={`tag ${tag === "starred" && "is-warning"} ${
            tag === "flagged" && "is-success"
          }`}
        >
          {tag}
        </span>
        <span className="tag is-delete" onClick={() => deleteTag()} />
      </div>
    </div>
  );
};

export const tagButtonHandler = async (visitData: any, tag?: string, fetchData?: any) => {
  if (!visitData) return;

  if (!tag) {
    tag = (prompt("Tag:") || "").trim().toLowerCase();
    if (!tag || visitData.tags.indexOf(tag) !== -1) return;
  }

  const shouldAdd = visitData.tags.indexOf(tag) === -1;

  await axios.request({
    method: shouldAdd ? "POST" : "DELETE",
    url: `/api/visit/${visitData._id}/tag`,
    data: {
      tag,
    },
  });
  fetchData && fetchData();
};

export const handleAddVisit = async (participant: any, fetchData?: any) => {
  await axios.post("/api/visit", { uuid: participant.uuid });
  fetchData && fetchData();
};

export const handleDeleteVisit = async (visitData: any, fetchData?: any) => {
  if (
    !window.confirm(
      "Are you sure that you want to delete this visit? All associated data such as tags and notes will be lost!"
    )
  )
    return;

  await axios.delete(`/api/visit/${visitData._id}`);
  fetchData && fetchData();
  window.location.reload();
};
