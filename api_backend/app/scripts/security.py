# file: backend_api/app/security.py

from datetime import datetime, timedelta, timezone
# 从 jose 库中导入 jwt
from jose import jwt, JWTError
from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordBearer


# 1. 配置
# 这串密钥是你的最高机密，绝对不能泄露！
# 在生产环境中，应该从环境变量中读取，而不是硬编码在代码里。
SECRET_KEY = "a_super_secret_and_long_string_for_your_project_!@#$%^&*()"
ALGORITHM = "HS256"  # 使用的签名算法
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # Token 有效期，这里设置为24小时
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def create_access_token(data: dict) -> str:
    """
    接收一个数据字典，将其编码成JWT字符串。

    :param data: 需要被编码进 Token 的数据字典 (payload)。
    :return: 编码后的JWT字符串。
    """
    to_encode = data.copy()
    
    # 设置过期时间
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # 使用密钥和算法对数据进行签名和编码
    encoded_jwt = jwt.encode(claims=to_encode, key=SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt

def decode_token(token: str) -> dict:
    """
    解码并验证一个JWT。如果验证失败，会抛出异常。
    
    :param token: JWT字符串。
    :return: 解码后的数据字典 (payload)。
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        # 如果解码失败（例如，签名不匹配、Token过期），则认证失败
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )