/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/anchor-is-valid */
import useAxios from "axios-hooks";
import React from "react";

interface Props {
  tagsFilter: string[];
  setTagsFilter: React.Dispatch<React.SetStateAction<string[]>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

const TableFilter: React.FC<Props> = props => {
  const [{ data: tagsData }] = useAxios("/api/tags");

  const handleTagSelected = (tag: string) => {
    if (props.tagsFilter.includes(tag)) {
      props.setTagsFilter(prevState => prevState.filter(element => element !== tag));
    } else {
      props.setTagsFilter(prevState => [...prevState, tag]);
    }
  };

  return (
    <div className="field is-grouped">
      <div className="control" id="search-control" style={{ flexGrow: 1 }}>
        <input
          className="input"
          type="text"
          placeholder="Search names, resume content, skills, etc."
          value={props.searchQuery}
          onChange={event => props.setSearchQuery(event.target.value)}
        />
      </div>
      <span className="spacer" />
      <div className="control">
        <div className="dropdown is-hoverable">
          <div className="dropdown-trigger">
            <button className="button">
              <span className="icon is-small">
                <i className="fas fa-filter" />
              </span>
              <span>Filter by tags</span>
              <span className="icon is-small">
                <i className="fas fa-angle-down" />
              </span>
            </button>
          </div>
          <div className="dropdown-menu">
            <div className="dropdown-content" id="filter-menu">
              {tagsData &&
                tagsData.tags &&
                tagsData.tags.map((tag: string) => (
                  <a className="dropdown-item tag-filter" key={tag}>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        data-value={tag}
                        checked={props.tagsFilter.includes(tag)}
                        onChange={() => handleTagSelected(tag)}
                      />
                      <span>{tag}</span>
                    </label>
                  </a>
                ))}
              <hr className="dropdown-divider" />
              <a className="dropdown-item" id="filter-none" onClick={() => props.setTagsFilter([])}>
                None
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableFilter;
