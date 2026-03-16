import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    type: z.enum(["text", "video", "image"]),
    model: z.string(),
    baseUrl: z.string(),
    apiKey: z.string(),
    modelType: z.string(),
    manufacturer: z.string(),
  }),
  async (req, res) => {
    const { type, model, baseUrl, apiKey, manufacturer, modelType } = req.body;

    // 获取当前最大 id
    const maxIdResult = await u.db("t_config").max("id as maxId").first();
    const newId = (maxIdResult?.maxId || 0) + 1;

    await u.db("t_config").insert({
      id: newId,
      type,
      model,
      baseUrl,
      apiKey,
      manufacturer,
      modelType,
      createTime: Date.now().toString(),
      userId: 1,
    });
    res.status(200).send(success("新增成功"));
  },
);
