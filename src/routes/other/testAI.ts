import express from "express";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import u from "@/utils";
import { z } from "zod";
const router = express.Router();

// 检查语言模型
export default router.post(
  "/",
  validateFields({
    modelName: z.string(),
    apiKey: z.string(),
    baseURL: z.string().optional(),
    manufacturer: z.string(),
  }),
  async (req, res) => {
    const { modelName, apiKey, baseURL, manufacturer } = req.body;

    try {
      // 简单测试：直接调用 AI 不使用工具
      const result = await u.ai.text.invoke(
        {
          prompt: "你好，请简单介绍一下你自己，用一句话回答。",
        },
        {
          model: modelName,
          apiKey,
          baseURL,
          manufacturer,
        },
      );
      res.status(200).send(success(result.text));
    } catch (err) {
      const msg = u.error(err).message;
      console.error(msg);
      res.status(500).send(error(msg));
    }
  },
);
