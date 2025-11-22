"use client";

import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  appName?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button = ({
  children,
  className,
  appName,
  onClick,
  disabled,
  type = 'button',
}: ButtonProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (appName) {
      alert(`Hello from your ${appName} app!`);
    }
  };

  return (
    <button
      className={className}
      onClick={handleClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
};
