const express = require("express");
const checkPermission = require("../middlewares/checkPermission");

function secureRouter() {
  const router = express.Router();

  const secureMethod = (method) => {
    return (path, permissionName, ...middlewaresAndHandler) => {
      if (!permissionName || typeof permissionName !== "string") {
        throw new Error("Missing permission name");
      }

      const permissionMiddleware = checkPermission(permissionName);

      // Tách middleware và handler
      const middlewares = middlewaresAndHandler.slice(0, -1); // tất cả trừ handler cuối
      const handler = middlewaresAndHandler[middlewaresAndHandler.length - 1]; // handler cuối

      // ✅ Đảm bảo thứ tự: auth → checkPermission → handler
      router[method](path, ...middlewares, permissionMiddleware, handler);
    };
  };

  router.secureGet = secureMethod("get");
  router.securePost = secureMethod("post");
  router.securePut = secureMethod("put");
  router.secureDelete = secureMethod("delete");

  return router;
}

module.exports = secureRouter;
