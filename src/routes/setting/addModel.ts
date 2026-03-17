import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    title: z.string().optional(), // 配置名称（可选）
    type: z.enum(["text", "video", "image"]),
    model: z.string(),
    baseUrl: z.string(),
    apiKey: z.string(),
    modelType: z.string(),
    manufacturer: z.string(),
    protocol: z.enum(["openai", "claude"]).optional(), // 协议类型（可选）
  }),
  async (req, res) => {
    const { title, type, model, baseUrl, apiKey, manufacturer, modelType, protocol } = req.body;

    // 获取当前最大 id
    const maxIdResult: any = await u.db("t_config").max("id as maxId").first();
    const newId = (maxIdResult?.maxId || 0) + 1;

    await u.db("t_config").insert({
      id: newId,
      title,
      type,
      model,
      baseUrl,
      apiKey,
      manufacturer,
      modelType,
      protocol: protocol || "openai", // 默认为 openai 协议
      createTime: Date.now(),
      userId: 1,
    });
    res.status(200).send(success("新增成功"));
  },
);
