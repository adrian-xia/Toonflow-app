import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// 更新原文数据
export default router.post(
  "/",
  validateFields({
    id: z.number(),
    chapterIndex: z.number(),
  }),
  async (req, res) => {
    const { id, chapterIndex, reel, chapter, chapterData } = req.body;

    await u.db("t_novel").where("id", id).update({
      chapterIndex,
      reel,
      chapter,
      chapterData,
    });

    res.status(200).send(success({ message: "更新原文成功" }));
  },
);
