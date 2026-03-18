import { Router } from "express";
import { HealthPayload, ok } from "@toonflow/kernel";

const router = Router();

router.get("/", (_req, res) => {
  const payload: HealthPayload = {
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString()
  };

  res.status(200).json(ok(payload));
});

export default router;
