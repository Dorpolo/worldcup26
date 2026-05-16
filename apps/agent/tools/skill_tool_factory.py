"""
Builds LangChain StructuredTools from 'tool'-type skills stored in the DB.
Each skill tool calls a one-shot LLM with the skill prompt to answer a focused query.
"""
import os
from langchain_core.tools import StructuredTool
from langchain_anthropic import ChatAnthropic
from pydantic import BaseModel, Field

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")


class SkillInput(BaseModel):
    query: str = Field(description="The question or request to pass to this skill")


def build_skill_tools(skills: list[dict]) -> list:
    tools = []
    for skill in skills:
        if skill.get("type") != "tool" or not skill.get("enabled", True):
            continue

        name        = skill.get("name", "skill").lower().replace(" ", "_")[:40]
        description = skill.get("description") or skill.get("prompt", "")[:120]
        prompt      = skill.get("prompt", "")

        def make_fn(skill_prompt: str):
            def skill_fn(query: str) -> str:
                api_key = os.getenv("ANTHROPIC_API_KEY", "")
                llm = ChatAnthropic(model=MODEL, api_key=api_key, max_tokens=512)
                full_prompt = skill_prompt.replace("{query}", query) if "{query}" in skill_prompt \
                    else f"{skill_prompt}\n\nUser query: {query}"
                result = llm.invoke(full_prompt)
                return result.content if isinstance(result.content, str) else str(result.content)
            return skill_fn

        tool = StructuredTool.from_function(
            func=make_fn(prompt),
            name=name,
            description=description,
            args_schema=SkillInput,
        )
        tools.append(tool)

    return tools
