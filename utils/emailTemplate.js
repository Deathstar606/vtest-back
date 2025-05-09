// utils/emailTemplate.js
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { frontend } = require("../baseUrl");

const Email = ({ name, message, items }) => {
  return React.createElement("div", { style: { backgroundColor: "#ffffff", padding: "20px", borderRadius: "5px" } },
    React.createElement("h1", { style: { textAlign: "center", padding: "10px" } }, `Hello, ${name}`),
    React.createElement("h3", { style: { textAlign: "center", padding: "10px" } }, message),
    ...items.map(item =>
      React.createElement("div", { key: item._id, style: { textAlign: "center", margin: "10px" } },
        React.createElement("p", null, item.name),
        React.createElement("a", {
          href: `${frontend}Veloura#/home/${item.category}/${item._id}`,
          style: {
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: 'black',
            color: 'yellow',
            textDecoration: 'none',
            borderRadius: '0px',
            cursor: 'pointer'
          }
        }, 'View Item')
      )
    ),
    React.createElement("div", { style: { textAlign: "center", padding: "10px" } },
      React.createElement("a", {
        href: "https://youtu.be/dQw4w9WgXcQ?si=zfjDpzT7HAfDG8Ev",
        style: {
          display: 'inline-block',
          padding: '10px 20px',
          backgroundColor: 'black',
          color: 'yellow',
          textDecoration: 'none',
          borderRadius: '0px',
          cursor: 'pointer'
        }
      }, "Press At Own Risk")
    )
  );
};

const generateEmailHtml = (name, message, items) => {
  const html = renderToStaticMarkup(React.createElement(Email, { name, message, items }));
  return `<!DOCTYPE html><html><body>${html}</body></html>`;
};

module.exports = { generateEmailHtml };
