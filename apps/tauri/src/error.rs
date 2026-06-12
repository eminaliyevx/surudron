use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    SerialPort(#[from] serialport::Error),

    #[error("{0}")]
    Io(#[from] std::io::Error),
}

#[derive(Serialize, Clone, Copy)]
#[serde(rename_all = "snake_case")]
pub enum ErrorKind {
    SerialPort,
    Io,
}

#[derive(Serialize)]
struct ErrorPayload {
    kind: ErrorKind,
    message: String,
}

impl AppError {
    pub const fn kind(&self) -> ErrorKind {
        return match self {
            Self::SerialPort(_) => ErrorKind::SerialPort,
            Self::Io(_) => ErrorKind::Io,
        };
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let payload = ErrorPayload {
            kind: self.kind(),
            message: self.to_string(),
        };

        return payload.serialize(serializer);
    }
}

pub type AppResult<T> = Result<T, AppError>;
