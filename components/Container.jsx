// components/Container.js

const Container = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl mx-auto text-center">
        <span className="text-2xl font-light">Hum to Instrument Transformer</span>
        <div className="mt-4 bg-white shadow-md rounded-lg p-6">{children}</div>
      </div>
    </div>
  );
};

export default Container;
