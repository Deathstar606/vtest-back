const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { frontend } = require("../baseUrl");

const Email = ({ name, message, items, phoneNumber, address, order_stat, delivery, total, transaction_id }) => {
  console.log("items: ", items)
  return React.createElement("div", {
    style: {
      backgroundColor: "#ffffff",
      padding: "20px",
      fontFamily: "Arial, sans-serif",
      borderRadius: "5px",
      color: "#333"
    }
  },
    // Company logo and motto
    React.createElement("div", { style: { textAlign: "center", marginBottom: "20px" } },
      React.createElement("img", {
        src: "https://res.cloudinary.com/dmrazifyy/image/upload/v1746942831/veloura_mx0d6z.png",
        alt: "Company Logo",
        style: { width: "150px", marginBottom: "10px" }
      }),
      React.createElement("h3", { style: { margin: 0, fontStyle: "italic" } }, "Wear your story")
    ),

    // Greeting and message
    React.createElement("h1", { style: { textAlign: "center" } }, `Hello, ${name}`),
    React.createElement("h3", { style: { textAlign: "center" } }, message),

    // Order details
    React.createElement("div", { style: { margin: "20px 0", padding: "10px", border: "1px solid #ddd", borderRadius: "5px" } },
      React.createElement("p", null, `Transaction ID: ${transaction_id}`),
      React.createElement("p", null, `Phone Number: ${phoneNumber}`),
      React.createElement("p", null, `Address: ${address}`),
      React.createElement("p", null, `Order Status: ${order_stat}`),
      React.createElement("p", null, `Delivery Charge: ${delivery}`),
      React.createElement("p", null, `Total Amount: ${total} TK`)
    ),

    // Items loop
    ...items.map(item =>
      React.createElement("div", {
        key: item._id,
        style: {
          display: "flex",
          alignItems: "center",
          border: "1px solid #ccc",
          borderRadius: "5px",
          padding: "10px",
          marginBottom: "15px"
        }
      },
        // Image on the left
        React.createElement("img", {
          src: item.image,
          alt: item.name,
          style: { width: "100px", height: "100px", objectFit: "cover", marginRight: "20px", borderRadius: "5px" }
        }),

        // Item details on the right
        React.createElement("div", null,
          React.createElement("p", null, `Name: ${item.name}`),
          React.createElement("p", null, `Category: ${item.category}`),
          React.createElement("p", null, `Color: ${item.color}`),
          React.createElement("p", null, `Size: ${item.size}`),
          React.createElement("p", null, `Price: ${item.price} TK`),
          React.createElement("p", null, `Quantity: ${item.quantity}`),
          React.createElement("a", {
            href: `${frontend}#/home/${item.category}/${item._id}`,
            style: {
              display: 'inline-block',
              padding: '8px 16px',
              border: "2px solid black",
              backgroundColor: 'transparent',
              color: 'black',
              textDecoration: 'none',
              marginTop: '5px'
            }
          }, 'View Item')
        )
      )
    )
  );
};

const generateEmailHtml = (name, message, items, phoneNumber, address, order_stat, delivery, total) => {
  const html = renderToStaticMarkup(
    React.createElement(Email, {
      name,
      message,
      items,
      phoneNumber,
      address,
      order_stat,
      delivery,
      total
    })
  );
  return `<!DOCTYPE html><html><body>${html}</body></html>`;
};

module.exports = { generateEmailHtml };
