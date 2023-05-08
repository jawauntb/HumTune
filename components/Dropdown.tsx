import React from 'react';

type DropdownProps = {
  label?: string | null;
  options: string[] | number[];
  value: string | number;
  onChange: (value: any) => void;
};

const Dropdown: React.FC<DropdownProps> = ({ label, options, value, onChange }) => {
  return (
    <div className="my-4">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select
        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Dropdown;
