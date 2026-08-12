import { Router } from "express";
import tagManager from "../function/tagManager";
import asyncHandler from "../utils/asyncHandler";

const routes = Router();

routes.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await tagManager.getAllTags());
  })
);

routes.get(
  "/search",
  asyncHandler(async (req, res) => {
    res.json(await tagManager.searchTags(String(req.query.q ?? "")));
  })
);

export default routes;
