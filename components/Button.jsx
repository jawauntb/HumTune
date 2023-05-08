// components/Button.js

const Button = ({ children, onClick }) => {
  return (
    <button
      className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
