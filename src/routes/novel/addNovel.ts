import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// 新增原文数据（支持单个和批量）
export default router.post(
  "/",
  async (req, res) => {
    const { projectId, chapterIndex, reel, chapter, chapterData, data } = req.body;

    // 获取当前最大 id
    const maxIdResult = await u.db("t_novel").max("id as maxId").first();
    let nextId = (maxIdResult?.maxId || 0) + 1;

    // 批量添加模式
    if (data && Array.isArray(data)) {
      for (const item of data) {
        await u.db("t_novel").insert({
          id: nextId++,
          projectId,
          chapterIndex: item.index,
          reel: item.reel,
          chapter: item.chapter,
          chapterData: item.chapterData,
          createTime: Date.now().toString(),
        });
      }
    } else {
      // 单个添加模式
      await u.db("t_novel").insert({
        id: nextId,
        projectId,
        chapterIndex,
        reel,
        chapter,
        chapterData,
        createTime: Date.now().toString(),
      });
    }

    res.status(200).send(success({ message: "新增原文成功" }));
  }
);
