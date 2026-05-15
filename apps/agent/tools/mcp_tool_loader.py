"""
Dynamically loads tools from remote MCP servers (Streamable HTTP, MCP 2025 spec).
Fetches tool list via GET /tools/list, wraps each as a StructuredTool.
"""
import httpx
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field, create_model
from typing import Any


async def load_mcp_tools(mcp_configs: list[dict]) -> list:
    tools = []
    for cfg in mcp_configs:
        if not cfg.get("enabled", True):
            continue

        url     = cfg.get("url", "").rstrip("/")
        headers = {h["key"]: h["value"] for h in cfg.get("headers", []) if h.get("key")}

        try:
            async with httpx.AsyncClient(timeout=8, headers=headers) as client:
                resp = await client.get(f"{url}/tools/list")
                if resp.status_code != 200:
                    continue
                tool_list = resp.json().get("tools", [])
        except Exception:
            continue

        for tool_def in tool_list:
            tool_name   = tool_def.get("name", "mcp_tool")
            tool_desc   = tool_def.get("description", "")
            input_schema = tool_def.get("inputSchema", {})

            # Build a Pydantic model from the JSON schema properties
            fields = {}
            props  = input_schema.get("properties", {})
            required = set(input_schema.get("required", []))
            for prop_name, prop_info in props.items():
                prop_type = prop_info.get("type", "string")
                py_type   = {"string": str, "number": float, "integer": int, "boolean": bool}.get(prop_type, Any)
                default   = ... if prop_name in required else None
                fields[prop_name] = (py_type, Field(default=default, description=prop_info.get("description", "")))

            DynamicModel = create_model(f"{tool_name}_input", **fields) if fields else BaseModel

            def make_call_fn(mcp_url: str, mcp_headers: dict, t_name: str):
                def call_fn(**kwargs) -> str:
                    try:
                        with httpx.Client(timeout=15, headers=mcp_headers) as c:
                            r = c.post(
                                f"{mcp_url}/tools/call",
                                json={"name": t_name, "arguments": kwargs},
                            )
                            if r.status_code == 200:
                                result = r.json()
                                content = result.get("content", result)
                                if isinstance(content, list):
                                    return "\n".join(
                                        item.get("text", str(item)) if isinstance(item, dict) else str(item)
                                        for item in content
                                    )
                                return str(content)
                            return f"MCP tool error: HTTP {r.status_code}"
                    except Exception as e:
                        return f"MCP tool error: {e}"
                return call_fn

            tool = StructuredTool.from_function(
                func=make_call_fn(url, headers, tool_name),
                name=tool_name,
                description=tool_desc or f"MCP tool: {tool_name}",
                args_schema=DynamicModel,
            )
            tools.append(tool)

    return tools
