FROM alpine as dev

RUN echo "Hello world from dev!"

FROM alpine as prod

RUN echo "Hello world from prod!"
