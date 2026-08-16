export default {
  async fetch(request, env) {
    const ALLOW_ORIGIN = "*";

    // 跨域预检 OPTIONS 请求处理
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": ALLOW_ORIGIN,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      })
    }

    if (request.method !== "POST") {
      return Response.json({ msg: "仅支持POST请求" }, { status: 400 });
    }

    try {
      const payload = await request.json();
      const USER_NAME = payload.name?.trim();
      if (!USER_NAME) {
        return Response.json({ success: false, msg: "名称不能为空" }, { status: 400 });
      }

      const OWNER = "qyxay";
      const REPO = "OneShotWeb";
      const FILE_PATH = "GodNames";
      const GITHUB_PAT = env.GITHUB_PAT;

      const apiHeaders = {
        Authorization: `token ${GITHUB_PAT}`,
        "User-Agent": "OneShotWeb-NameRecorder"
      };
      const fileUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

      // 获取当前文件内容
      let contentText = "";
      let fileSha = null;
      const getResp = await fetch(fileUrl, { headers: apiHeaders });
      if (getResp.ok) {
        const fileInfo = await getResp.json();
        contentText = atob(fileInfo.content);
        fileSha = fileInfo.sha;
      }

      const lineList = [];
      let matched = false;
      const rawLines = contentText.split("\n");
      for (const line of rawLines) {
        const trimLine = line.trimEnd();
        if (!trimLine) continue;
        const [storedName, countStr] = trimLine.split("\t");
        const num = Number(countStr) || 1;
        if (storedName === USER_NAME) {
          lineList.push(`${storedName}\t${num + 1}`);
          matched = true;
        } else {
          lineList.push(trimLine);
        }
      }
      if (!matched) {
        lineList.push(`${USER_NAME}\t1`);
      }
      const newContent = lineList.join("\n");

      // 提交文件更新
      const putBody = {
        message: `自动存档：${USER_NAME}`,
        content: btoa(newContent)
      };
      if (fileSha) putBody.sha = fileSha;

      const putResp = await fetch(fileUrl, {
        method: "PUT",
        headers: {
          ...apiHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(putBody)
      });

      if (!putResp.ok) {
        const errInfo = await putResp.text();
        throw new Error(`GitHub接口错误 ${putResp.status}: ${errInfo}`);
      }

      return Response.json({
        success: true,
        msg: "记录保存成功"
      }, {
        headers: { "Access-Control-Allow-Origin": ALLOW_ORIGIN }
      });

    } catch (err) {
      return Response.json({
        success: false,
        msg: "提交失败：" + err.message
      }, {
        status: 500,
        headers: { "Access-Control-Allow-Origin": ALLOW_ORIGIN }
      });
    }
  }
}