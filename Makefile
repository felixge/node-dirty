test:
	@find test/simple/test-*.js | xargs -n 1 -t node

benchmark-v8:
	@find benchmark/v8/*.js | xargs -n 1 -t node

benchmark-php:
	@find benchmark/php/*.php | xargs -n 1 -t php

benchmark-all: benchmark-v8 benchmark-php
	@find benchmark/*.js | xargs -n 1 -t node

benchmark:
	@find benchmark/*.js | xargs -n 1 -t node

.PHONY: test benchmark
