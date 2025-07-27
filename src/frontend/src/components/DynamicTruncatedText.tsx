import React, { useEffect, useState, useRef } from 'react';
import { Text, Tooltip } from '@chakra-ui/react';
import { truncateTextToWidth, shouldTruncateText } from '../utils/textMeasurement';

interface DynamicTruncatedTextProps {
  text: string;
  maxWidth?: number; // If not provided, will use container width
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  cursor?: string;
  [key: string]: any; // Allow other Text props
}

const DynamicTruncatedText: React.FC<DynamicTruncatedTextProps> = ({
  text,
  maxWidth,
  fontSize = '14px',
  fontWeight = 'normal',
  fontFamily,
  cursor,
  ...textProps
}) => {
  const [truncatedText, setTruncatedText] = useState(text);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTruncation = () => {
      let width = maxWidth;
      
      // If no maxWidth provided, measure container
      if (!width && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        width = containerRect.width - 16; // Account for padding
      }
      
      if (width && width > 0) {
        const needsTrunc = shouldTruncateText(text, width, fontSize, fontFamily, fontWeight);
        setNeedsTruncation(needsTrunc);
        
        if (needsTrunc) {
          const truncated = truncateTextToWidth(text, width, fontSize, fontFamily, fontWeight);
          setTruncatedText(truncated);
        } else {
          setTruncatedText(text);
        }
      }
    };

    // Initial measurement
    updateTruncation();

    // Update on window resize
    const handleResize = () => updateTruncation();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [text, maxWidth, fontSize, fontWeight, fontFamily]);

  if (needsTruncation) {
    return (
      <div ref={containerRef} style={{ width: maxWidth ? `${maxWidth}px` : '100%' }}>
        <Tooltip label={text} placement="top">
          <Text
            cursor={cursor || 'help'}
            fontSize={fontSize}
            fontWeight={fontWeight}
            fontFamily={fontFamily}
            {...textProps}
          >
            {truncatedText}
          </Text>
        </Tooltip>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: maxWidth ? `${maxWidth}px` : '100%' }}>
      <Text
        fontSize={fontSize}
        fontWeight={fontWeight}
        fontFamily={fontFamily}
        {...textProps}
      >
        {text}
      </Text>
    </div>
  );
};

export default DynamicTruncatedText;