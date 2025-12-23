import { Router } from "express";
import { CryptoController } from "../controllers/crypto.controller";

const cryptoRouter = Router();
const cryptoController = new CryptoController();

cryptoRouter.post("/add-users", cryptoController.addUsersBulk);
cryptoRouter.post("/encrypt", cryptoController.encrypt);
// cryptoRouter.post("/decrypt", cryptoController.decrypt);

export default cryptoRouter;
