import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// 新增项目
export default router.post(
  "/",
  validateFields({
    name: z.string(),
    intro: z.string(),
    type: z.string(),
    artStyle: z.string(),
    videoRatio: z.string(),
  }),
  async (req, res) => {
    const { name, intro, type, artStyle, videoRatio } = req.body;

    // 获取当前最大 id
    const maxIdResult = await u.db("t_project").max("id as maxId").first();
    const newId = (maxIdResult?.maxId || 0) + 1;

    await u.db("t_project").insert({
      id: newId,
      name,
      intro,
      type,
      artStyle,
      videoRatio,
      userId: 1,
      createTime: Date.now().toString(),
    });

    res.status(200).send(success({ message: "新增项目成功" }));
  }
);
