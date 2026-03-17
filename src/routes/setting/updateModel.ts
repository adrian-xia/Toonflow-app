import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    id: z.number(),
    title: z.string().optional(), // 配置名称（可选）
    type: z.enum(["text", "video", "image"]),
    model: z.string(),
    baseUrl: z.string(),
    modelType: z.string(),
    apiKey: z.string(),
    manufacturer: z.string(),
    protocol: z.enum(["openai", "claude"]).optional(), // 协议类型（可选）
  }),
  async (req, res) => {
    const { id, title, type, model, baseUrl, apiKey, manufacturer, modelType, protocol } = req.body;

    await u.db("t_config").where("id", id).update({
      title,
      type,
      model,
      baseUrl,
      apiKey,
      manufacturer,
      modelType,
      protocol: protocol || "openai", // 默认为 openai 协议
    });
    res.status(200).send(success("编辑成功"));
  },
);
