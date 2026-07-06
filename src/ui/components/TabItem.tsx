import React from "react";
import { Text } from "ink";

interface TabItemProps {
  isActive: boolean;
  label: string;
}

export const TabItem = ({ isActive, label }: TabItemProps): React.JSX.Element => {
  return (
    <Text bold={isActive} inverse={isActive}>
      {label}
    </Text>
  );
};
