import { createCn } from "cn/config";

// The D-40 type scale tokens are font sizes. Without this the merge treats
// text-micro and the like as text colours, and a colour class that follows
// one silently drops the size.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "title", "heading", "body", "small", "micro"] },
      ],
    },
  },
});
